// src/fantasy/FantasyTeamsTab.jsx
//
// Replaces the regular TeamsTab when settings.fantasyMode === true.
//
// Top section: status row (draft state, validation, scoring reminder)
// Middle:      filter bar + Run Draft button (commish only)
// Bottom:      48-team grid; each card shows team identity + ONE row per
//              owner of that team, ordered by draft pick order. Each row
//              has a dropdown for the owner to pick which Roto stat
//              (Goals / SoT / Cards / GA) they want for this team.
//
// Why owner-keyed instead of stat-keyed?
//   - The number of stats per team is naturally capped at the number of
//     owners, so showing one row per owner makes that constraint visually
//     obvious — no empty stat slots, no greyed-out rows.
//   - Draft pick order is meaningful: the manager who drafted the team
//     first is shown first, so the commish can walk through picks
//     deterministically ("User 1 picked first, what's their stat?
//     OK now User 3, what's left?").
//   - It naturally enforces "one stat per (owner, team)" — a manager
//     can't accidentally hoard multiple stats on a team they share.
//
// Storage shape stays manager-keyed for the Roto math:
//   picks[managerId][statId] = [teamId, ...]
// On render we pivot to team-keyed for display + conflict checking.

import React, { useState, useMemo } from 'react';
import { Filter, ArrowUpDown, Sparkles, Dice5, CheckCircle, AlertTriangle, Trophy, Lock, X } from 'lucide-react';
import { TEAMS_DATA } from '../config/data.js';
import { TeamLogo } from '../components/TeamLogo.jsx';
import { TeamPixelArt } from '../components/TeamPixelArt.jsx';
import { FANTASY_STATS, validatePicks } from './fantasyLogic.js';

// ─────────────────────────────────────────────────────────────────────────────
// Pivot helpers: convert between manager-keyed picks (storage) and
// team-keyed picks (UI).
// ─────────────────────────────────────────────────────────────────────────────

// Storage shape → UI shape
//   { managerId: { goals: [...] } }   →   { teamId: { goals: managerId } }
const pivotToTeamKeyed = (picks, members) => {
  const out = {};
  TEAMS_DATA.forEach(t => { out[t.id] = {}; });
  if (!picks) return out;
  members.forEach(m => {
    const mp = picks[m.id] || {};
    FANTASY_STATS.forEach(stat => {
      (mp[stat.id] || []).forEach(teamId => {
        if (out[teamId]) out[teamId][stat.id] = m.id;
      });
    });
  });
  return out;
};

// For each team, return its owners in DRAFT ORDER — the manager who got it
// in pass 0 first, then pass 1, etc. ownership[managerId] is the array of
// teams that manager picked in pass order, so a team's draft index for a
// given manager is just ownership[managerId].indexOf(teamId). Within a
// single pass through a group, a team can only be assigned to one manager
// (assignGroupPass removes it from the pool once picked), so draft indices
// for any given team are guaranteed unique across managers — no tiebreaker
// needed.
const buildTeamDraftOrderMap = (ownership, members) => {
  const out = {};
  TEAMS_DATA.forEach(t => { out[t.id] = []; });
  if (!ownership) return out;

  TEAMS_DATA.forEach(team => {
    const owners = [];
    members.forEach(m => {
      const teams = ownership[m.id] || [];
      const idx = teams.indexOf(team.id);
      if (idx >= 0) owners.push({ managerId: m.id, draftIndex: idx });
    });
    owners.sort((a, b) => a.draftIndex - b.draftIndex);
    out[team.id] = owners.map(o => o.managerId);
  });

  return out;
};

// For a single (manager, team), set which stat they own (or clear it).
// Operates on the manager-keyed storage shape and returns a NEW picks object.
//
// Semantics: each (manager, team) holds at most ONE stat. Setting a new
// stat for the same (manager, team) automatically clears whichever stat
// they previously held for that team. This enforces "one stat per owner
// per team" naturally.
const setOwnerPickForTeam = (picks, members, teamId, managerId, newStatId) => {
  // 1. Clone the current structure
  const next = {};
  members.forEach(m => {
    next[m.id] = {};
    FANTASY_STATS.forEach(s => {
      next[m.id][s.id] = [...((picks?.[m.id]?.[s.id]) || [])];
    });
  });

  if (!next[managerId]) return next;

  // 2. Remove this teamId from EVERY stat for this manager (so they end up
  //    with this team in at most one stat bucket).
  FANTASY_STATS.forEach(s => {
    next[managerId][s.id] = next[managerId][s.id].filter(t => t !== teamId);
  });

  // 3. Add to the new stat (unless clearing).
  if (newStatId && next[managerId][newStatId]) {
    next[managerId][newStatId] = [...next[managerId][newStatId], teamId];
  }

  return next;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// Compact labels for the per-owner stat dropdown. SoT and GA get abbreviated
// to keep the selector narrow on mobile; Goals and Cards stay as-is since
// they're already short.
const SELECTOR_STAT_LABEL = {
  goals:         'Goals',
  shotsOnTarget: 'SoT',
  cards:         'Cards',
  goalsAllowed:  'GA',
};

// One row per owner of a team. Shows the owner's draft-order ordinal +
// name, plus a dropdown to pick which Roto stat (Goals / SoT / Cards / GA)
// they want for this team. Stats already claimed by another owner of this
// team are shown disabled with the claimer's name as a suffix, so the
// commish immediately sees what's still available.
const OwnerStatRow = ({
  teamId,
  teamName,
  ordinal,
  manager,
  currentStatId,
  teamPicks,        // { [statId]: managerId } — every stat already claimed for this team
  members,
  disabled,
  blocked,
  onChange,
}) => {
  const fieldKey = `fantasy-pick-${teamId}-${manager?.id || 'unknown'}`;
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 w-full">
      <span className="text-[9px] sm:text-[10px] font-black text-purple-200 bg-black/30 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 tabular-nums">
        {ordinal}
      </span>
      <span className="text-[10px] sm:text-xs font-black text-white truncate flex-1 min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {manager?.name || 'Unknown'}
      </span>
      <select
        id={fieldKey}
        name={fieldKey}
        aria-label={`Stat pick for ${manager?.name || 'owner'} on ${teamName}`}
        value={currentStatId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[10px] sm:text-xs font-black text-purple-900 bg-white/95 border rounded-md px-1.5 py-1 focus:outline-none cursor-pointer truncate transition-colors w-[88px] sm:w-[110px] shrink-0 ${
          blocked
            ? 'border-red-500 ring-2 ring-red-300 focus:border-red-500'
            : 'border-white/50 focus:border-purple-500'
        } ${disabled ? 'cursor-not-allowed opacity-90' : ''} ${
          currentStatId ? '' : 'text-slate-400 italic'
        }`}
      >
        <option value="">Pick stat</option>
        {FANTASY_STATS.map(stat => {
          const claimerId = teamPicks?.[stat.id];
          const isMine = claimerId === manager?.id;
          const takenByOther = !!claimerId && !isMine;
          const takenByName = takenByOther
            ? (members.find(m => m.id === claimerId)?.name || 'Someone')
            : null;
          const label = SELECTOR_STAT_LABEL[stat.id] || stat.label;
          return (
            <option
              key={stat.id}
              value={stat.id}
              disabled={takenByOther}
            >
              {label}{takenByOther ? ` — ${takenByName}` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
};

// Floating toast — fixed to the viewport so it's visible regardless of scroll
const BlockToast = ({ message, onDismiss }) => (
  <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[200] animate-fade-in">
    <div className="bg-white border-2 border-red-300 rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-red-500 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs font-black text-white uppercase tracking-widest">
            Pick blocked
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white p-0.5 rounded transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm text-red-900 font-bold leading-snug">{message}</p>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const FantasyTeamsTab = ({
  isViewer,
  isOwner,
  members,
  ownership,
  picks,
  draftMeta,
  picksPerCategory = 5,
  fantasyUpdatePick,
  saveFantasyState,
  onOpenDraft,
}) => {
  // Filters mirror the existing TeamsTab patterns
  const [managerFilter, setManagerFilter] = useState(() => {
    try { return localStorage.getItem('wcFantasyManagerFilter') || 'All'; } catch { return 'All'; }
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    try { return localStorage.getItem('wcFantasyStatusFilter') || 'All'; } catch { return 'All'; }
  });
  const [sortBy, setSortBy] = useState(() => {
    try { return localStorage.getItem('wcFantasySort') || 'Group'; } catch { return 'Group'; }
  });

  // Soft-block state. Keyed by `${teamId}-${managerId}` so the owner row
  // that was rejected can be ringed in red. The toast is a separate piece
  // of state so we can dismiss it explicitly without clearing the ring.
  // Most conflicts are caught by the disabled <option> in OwnerStatRow,
  // but this is the safety net for race conditions / stale data.
  const [blockedSlots, setBlockedSlots] = useState({});
  const [blockMessage, setBlockMessage] = useState('');

  const handleManagerFilterChange = (val) => {
    setManagerFilter(val);
    try { localStorage.setItem('wcFantasyManagerFilter', val); } catch (e) {}
  };
  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    try { localStorage.setItem('wcFantasyStatusFilter', val); } catch (e) {}
  };
  const handleSortChange = (val) => {
    setSortBy(val);
    try { localStorage.setItem('wcFantasySort', val); } catch (e) {}
  };

  // ── Derived state ───────────────────────────────────────────────────────

  const teamKeyedPicks = useMemo(
    () => pivotToTeamKeyed(picks, members),
    [picks, members]
  );

  const validation = useMemo(
    () => validatePicks(members, picks, picksPerCategory),
    [members, picks, picksPerCategory]
  );

  const hasDraft = !!draftMeta && Object.keys(ownership || {}).length > 0;

  // For each team, the ordered list of managers (in draft pick order) who own it.
  const teamDraftOrderMap = useMemo(
    () => buildTeamDraftOrderMap(ownership, members),
    [ownership, members]
  );

  const draftedTeamIds = useMemo(() => {
    const set = new Set();
    Object.keys(teamDraftOrderMap).forEach(tid => {
      if (teamDraftOrderMap[tid].length > 0) set.add(tid);
    });
    return set;
  }, [teamDraftOrderMap]);

  // Number of stats currently assigned for a given team (= number of owners
  // who have picked a stat for it, since each (team, stat) is unique).
  const countAssignedStats = (teamId, picksMap) => {
    const tp = picksMap[teamId] || {};
    return FANTASY_STATS.reduce((acc, s) => acc + (tp[s.id] ? 1 : 0), 0);
  };

  // ── Filtering ───────────────────────────────────────────────────────────

  let displayedTeams = TEAMS_DATA;

  if (managerFilter !== 'All') {
    if (managerFilter === 'Drafted') {
      displayedTeams = displayedTeams.filter(t => draftedTeamIds.has(t.id));
    } else if (managerFilter === 'Excluded') {
      displayedTeams = displayedTeams.filter(t => !draftedTeamIds.has(t.id));
    } else {
      displayedTeams = displayedTeams.filter(t =>
        (ownership?.[managerFilter] || []).includes(t.id)
      );
    }
  }

  // A team is "Complete" when every owner has picked a stat — i.e.
  // assignedCount equals the per-team cap (min(ownerCount, 4)). "Incomplete"
  // is the negation. Excluded teams (no owners) are filtered out either way.
  if (statusFilter === 'Incomplete') {
    displayedTeams = displayedTeams.filter(t => {
      const ownerCount = teamDraftOrderMap[t.id]?.length || 0;
      if (ownerCount === 0) return false;
      const cap = Math.min(ownerCount, FANTASY_STATS.length);
      return countAssignedStats(t.id, teamKeyedPicks) < cap;
    });
  } else if (statusFilter === 'Complete') {
    displayedTeams = displayedTeams.filter(t => {
      const ownerCount = teamDraftOrderMap[t.id]?.length || 0;
      if (ownerCount === 0) return false;
      const cap = Math.min(ownerCount, FANTASY_STATS.length);
      return countAssignedStats(t.id, teamKeyedPicks) === cap && cap > 0;
    });
  }

  displayedTeams = [...displayedTeams].sort((a, b) => {
    if (sortBy === 'Group') {
      return a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group);
    }
    if (sortBy === 'Rank') return (a.rank || 999) - (b.rank || 999);
    if (sortBy === 'Name') return a.name.localeCompare(b.name);
    return 0;
  });

  // ── Action: handle a single owner picking/changing a stat for a team ────

  const flashBlocked = (slotKey, message) => {
    setBlockedSlots(prev => ({ ...prev, [slotKey]: true }));
    setBlockMessage(message);
    setTimeout(() => {
      setBlockedSlots(prev => {
        const { [slotKey]: _omit, ...rest } = prev;
        return rest;
      });
      setBlockMessage(prev => (prev === message ? '' : prev));
    }, 4000);
  };

  const handleOwnerPick = (teamId, managerId, newStatId) => {
    if (!isOwner) return;

    // Conflict check: if newStatId is set and already claimed by a DIFFERENT
    // manager for this team, block. The disabled <option> in OwnerStatRow
    // catches most cases at the UI layer; this is the safety net.
    if (newStatId) {
      const claimerId = teamKeyedPicks[teamId]?.[newStatId];
      if (claimerId && claimerId !== managerId) {
        const claimerName = members.find(m => m.id === claimerId)?.name || 'Someone';
        const statLabel = FANTASY_STATS.find(s => s.id === newStatId)?.label || newStatId;
        const teamName = TEAMS_DATA.find(t => t.id === teamId)?.name || teamId;
        flashBlocked(
          `${teamId}-${managerId}`,
          `${claimerName} already picked ${statLabel} for ${teamName}. Each stat can only be claimed by one owner per team.`
        );
        return;
      }
    }

    const newPicks = setOwnerPickForTeam(picks, members, teamId, managerId, newStatId);
    saveFantasyState('picks', newPicks);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top status row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className={`rounded-xl border-2 shadow-sm p-4 flex flex-col gap-1 ${
          hasDraft ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            hasDraft ? 'text-purple-600' : 'text-amber-600'
          }`}>Draft Status</span>
          {hasDraft ? (
            <>
              <span className="text-sm font-black text-purple-900">
                {draftMeta.teamsPerManager} teams · {members.length} managers
              </span>
              <span className="text-xs text-purple-700 font-medium leading-snug">
                Drafted {new Date(draftMeta.draftedAt).toLocaleDateString()}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-black text-amber-900">No draft yet</span>
              <span className="text-xs text-amber-800 font-medium leading-snug">
                {isOwner
                  ? 'Run the draft to assign teams to managers.'
                  : 'Waiting for the commish to run the draft.'}
              </span>
            </>
          )}
        </div>

        <div className={`rounded-xl border-2 shadow-sm p-4 flex flex-col gap-1 ${
          validation.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
            validation.ok ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            {validation.ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            Stat Picks
          </span>
          <span className={`text-sm font-black ${validation.ok ? 'text-emerald-900' : 'text-slate-800'}`}>
            {validation.ok ? 'All complete' : `${validation.issues.length} issue${validation.issues.length === 1 ? '' : 's'}`}
          </span>
          <span className="text-xs text-slate-500 font-medium leading-snug">
            Each manager needs {picksPerCategory} pick{picksPerCategory === 1 ? '' : 's'} per category.
          </span>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Roto Format
          </span>
          <ul className="text-[11px] text-slate-600 font-medium leading-snug space-y-1">
            <li>
              <span className="font-black text-slate-800">Goals (G)</span>
              {' '}— total goals scored
              {' '}<span className="text-emerald-700 font-bold">(higher is better)</span>
            </li>
            <li>
              <span className="font-black text-slate-800">Shots on Target (SoT)</span>
              {' '}— shots that hit the frame
              {' '}<span className="text-emerald-700 font-bold">(higher is better)</span>
            </li>
            <li>
              <span className="font-black text-slate-800">Cards</span>
              {' '}— yellow ×1 + red ×3 penalty
              {' '}<span className="text-rose-700 font-bold">(lower is better)</span>
            </li>
            <li>
              <span className="font-black text-slate-800">Goals Allowed (GA)</span>
              {' '}— goals conceded by your teams
              {' '}<span className="text-rose-700 font-bold">(lower is better)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Validation issues ─────────────────────────────────────── */}
      {!validation.ok && hasDraft && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-900 uppercase tracking-wide mb-1">
                Picks Incomplete
              </p>
              <ul className="text-xs text-amber-800 font-medium space-y-0.5 list-disc list-inside">
                {validation.issues.slice(0, 6).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
                {validation.issues.length > 6 && (
                  <li className="italic">...and {validation.issues.length - 6} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter / Action bar ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Owner:</span>
            <select
              id="fantasy-teams-owner-filter"
              name="ownerFilter"
              aria-label="Filter teams by owner"
              value={managerFilter}
              onChange={(e) => handleManagerFilterChange(e.target.value)}
              className="bg-transparent text-sm font-black text-purple-800 focus:outline-none w-full cursor-pointer"
            >
              <option value="All">All Teams</option>
              <option value="Drafted">Drafted Teams</option>
              <option value="Excluded">Excluded Teams</option>
              <option disabled>──────────</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}'s Teams</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Status:</span>
            <select
              id="fantasy-teams-status-filter"
              name="statusFilter"
              aria-label="Filter teams by completion status"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="bg-transparent text-sm font-black text-purple-800 focus:outline-none w-full cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Incomplete">Incomplete (missing picks)</option>
              <option value="Complete">Complete (all owners picked)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Sort:</span>
            <select
              id="fantasy-teams-sort-by"
              name="sortBy"
              aria-label="Sort teams by"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-transparent text-sm font-black text-purple-800 focus:outline-none w-full cursor-pointer"
            >
              <option value="Group">Group</option>
              <option value="Rank">FIFA Rank</option>
              <option value="Name">Name</option>
            </select>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={onOpenDraft}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-lg shadow-md uppercase text-xs tracking-widest transition-all w-full lg:w-auto shrink-0"
          >
            <Dice5 className="w-4 h-4" />
            {hasDraft ? 'View / Re-roll Draft' : 'Run Draft'}
          </button>
        )}
      </div>

      {/* ── Empty state when no draft yet ─────────────────────────── */}
      {!hasDraft && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-700 uppercase tracking-wide mb-1">
            No Draft Yet
          </p>
          <p className="text-sm text-slate-500 font-medium leading-snug max-w-md mx-auto">
            {isOwner
              ? 'Click Run Draft above to randomly assign teams to managers. Once drafted, each owner of a team will pick one of the four Roto stats here, in the order they drafted that team.'
              : 'The commish hasn\'t run the draft yet. Once they do, all teams will appear here with their Roto stat assignments.'}
          </p>
        </div>
      )}

      {/* ── Team cards ──────────────────────────────────────────────── */}
      {hasDraft && (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {displayedTeams.map(team => {
            const isInDraft = draftedTeamIds.has(team.id);
            const tp = teamKeyedPicks[team.id] || {};
            const ownerIdsInOrder = teamDraftOrderMap[team.id] || [];
            const cap = Math.min(ownerIdsInOrder.length, FANTASY_STATS.length);
            const assignedCount = countAssignedStats(team.id, teamKeyedPicks);
            const allDone = assignedCount === cap && cap > 0;

            // Reverse lookup: for each owner of this team, which stat (if any)
            // do they currently hold? Used to populate each row's dropdown.
            const ownerCurrentStat = {};
            FANTASY_STATS.forEach(s => {
              if (tp[s.id]) ownerCurrentStat[tp[s.id]] = s.id;
            });

            return (
              <div
                key={team.id}
                className={`group relative rounded-2xl border-2 shadow-md flex flex-col overflow-hidden transition-all ${
                  !isInDraft
                    ? 'border-slate-200 opacity-60 grayscale'
                    : allDone
                      ? 'border-emerald-300'
                      : 'border-purple-200 hover:border-purple-400'
                }`}
              >
                <div className="absolute inset-0 z-0 bg-slate-800">
                  <TeamPixelArt teamId={team.id} className="w-full h-full object-cover object-center opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-slate-900/70 to-slate-900/95" />
                </div>

                {!isInDraft && (
                  <div className="absolute top-0 left-0 right-0 bg-slate-700 text-slate-200 text-center py-1 text-[10px] font-black uppercase tracking-widest z-20 shadow-md flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Excluded from draft
                  </div>
                )}

                <div className="relative z-10 flex flex-col items-center pt-5 sm:pt-6 px-2 pb-2 w-full min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full p-2 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] mb-2 shrink-0">
                    <TeamLogo teamId={team.id} className="w-full h-full object-contain" />
                  </div>
                  <span className={`font-black text-white text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-1 block w-full truncate ${
                    team.name.length > 15 ? 'text-sm' : 'text-base sm:text-lg'
                  }`}>
                    {team.name}
                  </span>
                  <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-slate-800 px-1.5 py-0.5 rounded shadow-sm">
                      Group {team.group}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-emerald-800 px-1.5 py-0.5 rounded shadow-sm">
                      Rank {team.rank}
                    </span>
                    {isInDraft && (
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${
                        allDone
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-purple-200 text-purple-900'
                      }`}>
                        {assignedCount}/{cap} stats
                      </span>
                    )}
                  </div>
                </div>

                {/* Owner rows — one per owner, in draft pick order. */}
                {isInDraft && ownerIdsInOrder.length > 0 && (
                  <div className="relative z-10 flex flex-col gap-1.5 p-2 sm:p-3 mt-auto bg-black/30 backdrop-blur-sm border-t border-white/10">
                    {ownerIdsInOrder.map((mgrId, idx) => {
                      const mgr = members.find(m => m.id === mgrId);
                      const slotKey = `${team.id}-${mgrId}`;
                      return (
                        <OwnerStatRow
                          key={mgrId}
                          teamId={team.id}
                          teamName={team.name}
                          ordinal={idx + 1}
                          manager={mgr}
                          currentStatId={ownerCurrentStat[mgrId]}
                          teamPicks={tp}
                          members={members}
                          disabled={!isOwner}
                          blocked={!!blockedSlots[slotKey]}
                          onChange={(newStatId) => handleOwnerPick(team.id, mgrId, newStatId)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasDraft && displayedTeams.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500 font-medium">
          No teams match the current filters.
        </div>
      )}

      {/* ── Floating block toast ───────────────────────────────────── */}
      {blockMessage && (
        <BlockToast message={blockMessage} onDismiss={() => setBlockMessage('')} />
      )}
    </div>
  );
};
