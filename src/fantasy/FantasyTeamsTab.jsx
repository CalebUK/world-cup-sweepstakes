// src/fantasy/FantasyTeamsTab.jsx
//
// Replaces the regular TeamsTab when settings.fantasyMode === true.
//
// Top section: status row (draft state, validation, scoring reminder)
// Middle:      filter bar + Run Draft button (commish only)
// Bottom:      48-team grid; each card shows team identity + 4 stat dropdowns
//              (Goals, Shots on Target, Cards, Goals Allowed) for assigning
//              ownership to managers.
//
// Storage shape stays manager-keyed for the Roto math:
//   picks[managerId][statId] = [teamId, ...]
// The UI shows team-keyed: for each team, who owns each stat?
// We pivot to team-keyed on render and back to manager-keyed on save.

import React, { useState, useMemo } from 'react';
import { Filter, ArrowUpDown, Sparkles, Dice5, CheckCircle, AlertTriangle, Trophy, Lock } from 'lucide-react';
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

// Set a single (team, stat) → managerId in the manager-keyed structure.
// Returns a NEW picks object suitable for saving.
const setPickInStorage = (picks, members, teamId, statId, newManagerId) => {
  // 1. clone the current structure
  const next = {};
  members.forEach(m => {
    next[m.id] = {};
    FANTASY_STATS.forEach(s => {
      next[m.id][s.id] = [...((picks?.[m.id]?.[s.id]) || [])];
    });
  });

  // 2. remove this teamId from any existing manager's list for this stat
  Object.keys(next).forEach(mid => {
    next[mid][statId] = next[mid][statId].filter(t => t !== teamId);
  });

  // 3. add it to the new manager (unless newManagerId is empty/Unassigned)
  if (newManagerId && next[newManagerId]) {
    next[newManagerId][statId] = [...next[newManagerId][statId], teamId];
  }

  return next;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const StatDropdown = ({ stat, currentManagerId, members, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-0.5 w-full">
      <span className="text-[8px] font-black text-white/70 uppercase tracking-wider px-1">
        {stat.shortLabel}
      </span>
      <select
        value={currentManagerId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full text-[10px] sm:text-xs font-black text-purple-900 bg-white/95 border border-white/50 rounded-md px-1.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer truncate ${
          disabled ? 'cursor-not-allowed opacity-90' : ''
        } ${currentManagerId ? '' : 'text-slate-400 italic'}`}
      >
        <option value="">— unassigned —</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
};

// Per-stat label shown on the team card (shorter than the canonical label)
const STAT_SHORT = {
  goals:         'Goals',
  shotsOnTarget: 'SoT',
  cards:         'Cards',
  goalsAllowed:  'GA',
};

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

  // Set of team IDs that appear in ANY manager's ownership — these are the
  // "in play" teams. Teams excluded by FIFA-rank cutoff aren't drafted and
  // can't be picked for stats.
  const draftedTeamIds = useMemo(() => {
    const set = new Set();
    Object.values(ownership || {}).forEach(arr => arr.forEach(tid => set.add(tid)));
    return set;
  }, [ownership]);

  // Owners of each team (for the small "owned by" caption on each card).
  // A team can have multiple owners due to the multi-pass draft.
  const teamOwners = useMemo(() => {
    const out = {};
    TEAMS_DATA.forEach(t => { out[t.id] = []; });
    if (!ownership) return out;
    members.forEach(m => {
      (ownership[m.id] || []).forEach(tid => {
        if (out[tid]) out[tid].push(m.name);
      });
    });
    return out;
  }, [ownership, members]);

  // ── Filtering ───────────────────────────────────────────────────────────

  let displayedTeams = TEAMS_DATA;

  if (managerFilter !== 'All') {
    if (managerFilter === 'Drafted') {
      displayedTeams = displayedTeams.filter(t => draftedTeamIds.has(t.id));
    } else if (managerFilter === 'Excluded') {
      displayedTeams = displayedTeams.filter(t => !draftedTeamIds.has(t.id));
    } else {
      // by manager name (anyone who owns this team)
      displayedTeams = displayedTeams.filter(t =>
        (ownership?.[managerFilter] || []).includes(t.id)
      );
    }
  }

  if (statusFilter === 'Incomplete') {
    displayedTeams = displayedTeams.filter(t => {
      const tp = teamKeyedPicks[t.id] || {};
      return FANTASY_STATS.some(s => !tp[s.id]);
    });
  } else if (statusFilter === 'Complete') {
    displayedTeams = displayedTeams.filter(t => {
      const tp = teamKeyedPicks[t.id] || {};
      return FANTASY_STATS.every(s => !!tp[s.id]);
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

  // ── Action: change a single stat owner ──────────────────────────────────

  const handlePickChange = (teamId, statId, newManagerId) => {
    if (!isOwner) return;
    const newPicks = setPickInStorage(picks, members, teamId, statId, newManagerId);
    // Save the whole picks blob — small enough that it's fine,
    // and avoids race conditions from partial updates.
    saveFantasyState('picks', newPicks);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top status row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1. Draft state */}
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

        {/* 2. Picks validation */}
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

        {/* 3. Roto reminder */}
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Roto Format
          </span>
          <span className="text-sm font-black text-slate-800">
            Goals · SoT · Cards · GA
          </span>
          <span className="text-xs text-slate-500 font-medium leading-snug">
            Cards & GA are bad — lower is better.
          </span>
        </div>
      </div>

      {/* ── Validation issues (when there are any) ─────────────────── */}
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
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="bg-transparent text-sm font-black text-purple-800 focus:outline-none w-full cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Incomplete">Incomplete (missing picks)</option>
              <option value="Complete">Complete (all 4 assigned)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Sort:</span>
            <select
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
              ? 'Click Run Draft above to randomly assign teams to managers. Once drafted, managers will agree their stat picks offline and you can enter them on each team card below.'
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
            const owners = teamOwners[team.id] || [];
            const allFour = FANTASY_STATS.every(s => !!tp[s.id]);

            return (
              <div
                key={team.id}
                className={`group relative rounded-2xl border-2 shadow-md flex flex-col overflow-hidden transition-all ${
                  !isInDraft
                    ? 'border-slate-200 opacity-60 grayscale'
                    : allFour
                      ? 'border-emerald-300'
                      : 'border-purple-200 hover:border-purple-400'
                }`}
              >
                {/* Background pixel art (matches existing TeamsTab vibe) */}
                <div className="absolute inset-0 z-0 bg-slate-800">
                  <TeamPixelArt teamId={team.id} className="w-full h-full object-cover object-center opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-slate-900/70 to-slate-900/95" />
                </div>

                {/* Excluded ribbon */}
                {!isInDraft && (
                  <div className="absolute top-0 left-0 right-0 bg-slate-700 text-slate-200 text-center py-1 text-[10px] font-black uppercase tracking-widest z-20 shadow-md flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Excluded from draft
                  </div>
                )}

                {/* Top: identity */}
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
                  </div>
                  {owners.length > 0 && (
                    <div className="text-[9px] text-white/90 font-bold uppercase tracking-wider mt-1.5 text-center max-w-full truncate px-1">
                      Owned by: <span className="text-purple-200">{owners.join(' & ')}</span>
                    </div>
                  )}
                </div>

                {/* Bottom: 4 stat dropdowns (only when team is in draft) */}
                {isInDraft && (
                  <div className="relative z-10 grid grid-cols-2 gap-1.5 p-2 sm:p-3 mt-auto bg-black/30 backdrop-blur-sm border-t border-white/10">
                    {FANTASY_STATS.map(stat => (
                      <StatDropdown
                        key={stat.id}
                        stat={{ ...stat, shortLabel: STAT_SHORT[stat.id] }}
                        currentManagerId={tp[stat.id]}
                        members={members}
                        disabled={!isOwner}
                        onChange={(newId) => handlePickChange(team.id, stat.id, newId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty result hint (filters too tight) ─────────────────── */}
      {hasDraft && displayedTeams.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500 font-medium">
          No teams match the current filters.
        </div>
      )}
    </div>
  );
};
