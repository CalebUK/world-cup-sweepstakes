// src/fantasy/FantasyStandingsTab.jsx
//
// Replaces the regular StandingsTab when settings.fantasyMode === true.
//
// Roto scoring leaderboard with three sections:
//   1. Top podium — gold/silver/bronze for the top 3 managers (mirrors the
//      Awards section of the regular StandingsTab visually but Roto-themed)
//   2. Full rankings table — every manager with their per-category Roto
//      points and the raw stat totals that produced them
//   3. Per-stat leaderboards — one mini-table per category showing each
//      manager's summed stat and where they rank in that category
//
// Empty states:
//   - No draft yet → instruct the commish to run it
//   - Draft exists but picks incomplete → show standings anyway with a
//     warning banner (zero values still rank, ties just stay tied)

import React, { useMemo } from 'react';
import { Sparkles, Trophy, Medal, AlertTriangle, Target, Crosshair, Square, Shield } from 'lucide-react';
import { aggregateTeamStats, calculateRotoStandings, FANTASY_STATS, validatePicks } from './fantasyLogic.js';
import { TEAMS_DATA } from '../config/data.js';

// ── Small visuals ──────────────────────────────────────────────────────────

const STAT_ICON = {
  goals:         Target,
  shotsOnTarget: Crosshair,
  cards:         Square,        // a stand-in for a "card"
  goalsAllowed:  Shield,
};

const PODIUM_SVG = {
  1: { src: '/standings/first.svg',  alt: '1st Place' },
  2: { src: '/standings/second.svg', alt: '2nd Place' },
  3: { src: '/standings/third.svg',  alt: '3rd Place' },
};

const STAT_COLOR = {
  goals:         { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  shotsOnTarget: { text: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
  cards:         { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  goalsAllowed:  { text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
};

// Format Roto points: integers stay integer, halves show as ".5"
const fmtPts = (n) => {
  if (n === undefined || n === null) return '0';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
};

// ── Podium row (top 3) ─────────────────────────────────────────────────────

const podiumIcon = (place) => {
  if (place === 1) return { color: 'text-yellow-500',  bg: 'bg-yellow-50',  border: 'border-yellow-300', label: '1st' };
  if (place === 2) return { color: 'text-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-300',  label: '2nd' };
  if (place === 3) return { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300',  label: '3rd' };
  return null;
};

const PodiumCard = ({ standing, place }) => {
  const style = podiumIcon(place);
  const svg = PODIUM_SVG[place];
  if (!standing || !style) return null;
  return (
    <div className={`rounded-xl border-2 shadow-md p-4 flex flex-col gap-2 ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={svg.src}
            alt={svg.alt}
            className="w-8 h-8 drop-shadow-md shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className={`text-xs font-black uppercase tracking-widest ${style.color}`}>{style.label}</span>
        </div>
        <span className="text-2xl font-black text-slate-800">{fmtPts(standing.rotoTotal)}</span>
      </div>
      <div className="text-base font-black text-slate-800 truncate">{standing.name}</div>
      <div className="grid grid-cols-4 gap-1 mt-1">
        {FANTASY_STATS.map(stat => (
          <div key={stat.id} className={`text-center rounded px-1 py-1 ${STAT_COLOR[stat.id].bg} border ${STAT_COLOR[stat.id].border}`}>
            <div className={`text-[8px] font-black uppercase tracking-wider ${STAT_COLOR[stat.id].text}`}>
              {stat.id === 'shotsOnTarget' ? 'SoT' : stat.id === 'goalsAllowed' ? 'GA' : stat.label}
            </div>
            <div className="text-sm font-black text-slate-800">
              {fmtPts(standing.categoryPoints[stat.id])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Per-stat mini leaderboard ──────────────────────────────────────────────

const StatLeaderboard = ({ stat, standings }) => {
  const Icon = STAT_ICON[stat.id];
  const color = STAT_COLOR[stat.id];
  // Sort by the raw category total (best first)
  const sorted = [...standings].sort((a, b) => {
    const av = a.categoryTotals[stat.id];
    const bv = b.categoryTotals[stat.id];
    return stat.higherIsBetter ? bv - av : av - bv;
  });

  return (
    <div className={`rounded-xl border-2 shadow-sm overflow-hidden ${color.border} bg-white`}>
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${color.bg} border-b-2 ${color.border}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color.text}`} />
          <span className={`text-xs font-black uppercase tracking-widest ${color.text}`}>
            {stat.label}
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {stat.higherIsBetter ? 'Higher is better' : 'Lower is better'}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {sorted.map((s, idx) => (
            <tr key={s.id} className={`border-b border-slate-50 last:border-0 ${idx === 0 ? 'bg-slate-50/50' : ''}`}>
              <td className="px-3 py-1.5 w-8 text-center">
                <span className={`text-xs font-black ${idx === 0 ? color.text : 'text-slate-400'}`}>
                  {idx + 1}
                </span>
              </td>
              <td className="px-2 py-1.5 font-bold text-slate-700 truncate max-w-0">{s.name}</td>
              <td className="px-3 py-1.5 text-right font-black text-slate-800 tabular-nums">
                {s.categoryTotals[stat.id]}
              </td>
              <td className="px-3 py-1.5 text-right w-20">
                <span className={`text-[10px] font-black whitespace-nowrap inline-block ${color.text} ${color.bg} px-1.5 py-0.5 rounded border ${color.border}`}>
                  {fmtPts(s.categoryPoints[stat.id])} pts
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export const FantasyStandingsTab = ({
  members,
  matches,
  picks,
  match,
  draftMeta,
  picksPerCategory = 5,
}) => {
  const hasDraft = !!draftMeta && Object.keys(picks || {}).length > 0
    || !!draftMeta;  // even if picks empty, we can still render once drafted

  // ── Compute everything ──────────────────────────────────────────────────

  const teamTotals = useMemo(
    () => aggregateTeamStats(matches || [], matchStats || {}),
    [matches, matchStats]
  );

  const standings = useMemo(
    () => calculateRotoStandings(members, picks, teamTotals),
    [members, picks, teamTotals]
  );

  const validation = useMemo(
    () => validatePicks(members, picks, picksPerCategory),
    [members, picks, picksPerCategory]
  );

  // Total played matches with at least some stats entered (for the header pill)
  const playedMatchesWithStats = useMemo(() => {
    if (!matches || !matchStats) return 0;
    return matches.filter(m => {
      if (!m.isPlayed) return false;
      const ms = matchStats[m.id];
      if (!ms) return false;
      const a = ms.teamA || {};
      const b = ms.teamB || {};
      const hasAny = (s) => ['goals','shotsOnTarget','yellows','reds'].some(f => s[f] !== undefined && s[f] !== '' && s[f] !== null);
      return hasAny(a) || hasAny(b);
    }).length;
  }, [matches, matchStats]);


  // ── Render ──────────────────────────────────────────────────────────────

  // No draft yet: tell people to come back later
  if (!draftMeta) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-base font-black text-amber-900 uppercase tracking-wide mb-1">
            No Roto Standings Yet
          </p>
          <p className="text-sm text-amber-800 font-medium leading-snug max-w-md mx-auto">
            The commish hasn't run the Fantasy draft yet. Once they do — and managers'
            stat picks are entered on the Teams tab — Roto standings will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header / status ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-black text-purple-900 uppercase tracking-wide">
            Roto Standings
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-1 rounded">
            {playedMatchesWithStats} / 103 played matches with stats
          </span>
          <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest bg-purple-50 border border-purple-200 px-2 py-1 rounded">
            {picksPerCategory} picks per category
          </span>
        </div>
      </div>

      {/* ── Validation banner (picks incomplete) ──────────────────── */}
      {!validation.ok && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-amber-900 uppercase tracking-wide">
              Picks Incomplete
            </p>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              Standings still calculate, but they'll change once all stat picks are assigned in the Teams tab.
              {' '}
              <span className="italic">{validation.issues.length} issue{validation.issues.length === 1 ? '' : 's'} pending.</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Top podium ─────────────────────────────────────────────── */}
      {standings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PodiumCard standing={standings[0]} place={1} />
          {standings[1] && <PodiumCard standing={standings[1]} place={2} />}
          {standings[2] && <PodiumCard standing={standings[2]} place={3} />}
        </div>
      )}

      {/* ── Full standings table ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border-2 border-purple-100 overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b-2 border-purple-100 flex items-center gap-2">
          <Medal className="w-5 h-5 text-purple-500" />
          <span className="text-sm font-black text-purple-800 uppercase tracking-widest">
            Full Roto Standings
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-purple-700 text-xs border-b-2 border-purple-100">
                <th className="p-3 font-black uppercase tracking-wider w-12 text-center">#</th>
                <th className="p-3 font-black uppercase tracking-wider">Manager</th>
                <th className="p-3 font-black uppercase tracking-wider text-center w-20">Roto</th>
                <th className="p-3 font-black uppercase tracking-wider text-center text-emerald-700 hidden sm:table-cell" title="Goals (raw / Roto pts)">G</th>
                <th className="p-3 font-black uppercase tracking-wider text-center text-sky-700 hidden sm:table-cell" title="Shots on Target (raw / Roto pts)">SoT</th>
                <th className="p-3 font-black uppercase tracking-wider text-center text-amber-700 hidden sm:table-cell" title="Cards Penalty (raw / Roto pts)">Cards</th>
                <th className="p-3 font-black uppercase tracking-wider text-center text-rose-700 hidden sm:table-cell" title="Goals Allowed (raw / Roto pts)">GA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => {
                const isFirst = idx === 0 && s.rotoTotal > 0;
                return (
                  <tr key={s.id} className={`border-b border-slate-50 last:border-0 transition-colors ${isFirst ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}>
                    <td className="p-3 text-center">
                      <span className={`font-black ${isFirst ? 'text-emerald-700 text-base' : 'text-slate-500'}`}>
                        {s.rank}
                      </span>
                    </td>
                    <td className="p-3 font-black text-slate-800 truncate max-w-0">{s.name}</td>
                    <td className="p-3 text-center">
                      <span className={`text-lg font-black ${isFirst ? 'text-emerald-700' : 'text-purple-700'}`}>
                        {fmtPts(s.rotoTotal)}
                      </span>
                    </td>

                    {/* Per-category cells: raw stat (small) + roto points (badge) */}
                    {FANTASY_STATS.map(stat => (
                      <td key={stat.id} className="p-3 text-center hidden sm:table-cell">
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[10px] text-slate-500 font-bold tabular-nums">
                            {s.categoryTotals[stat.id]}
                          </span>
                          <span className={`text-[10px] font-black ${STAT_COLOR[stat.id].text} ${STAT_COLOR[stat.id].bg} px-1.5 py-0.5 rounded border ${STAT_COLOR[stat.id].border} mt-0.5`}>
                            {fmtPts(s.categoryPoints[stat.id])} pts
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile-only stat breakdown card per manager (since the wide columns hide on small screens) */}
        <div className="sm:hidden divide-y-2 divide-slate-100">
          {standings.map(s => (
            <div key={`m-${s.id}`} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-slate-500 w-5 text-center shrink-0">{s.rank}</span>
                  <span className="text-sm font-black text-slate-800 truncate">{s.name}</span>
                </div>
                <span className="text-base font-black text-purple-700 shrink-0">{fmtPts(s.rotoTotal)}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {FANTASY_STATS.map(stat => (
                  <div key={stat.id} className={`rounded px-1 py-1 text-center ${STAT_COLOR[stat.id].bg} border ${STAT_COLOR[stat.id].border}`}>
                    <div className={`text-[8px] font-black uppercase ${STAT_COLOR[stat.id].text}`}>
                      {stat.id === 'shotsOnTarget' ? 'SoT' : stat.id === 'goalsAllowed' ? 'GA' : stat.label}
                    </div>
                    <div className="text-[10px] font-bold text-slate-600">{s.categoryTotals[stat.id]}</div>
                    <div className={`text-[10px] font-black ${STAT_COLOR[stat.id].text}`}>{fmtPts(s.categoryPoints[stat.id])}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-stat leaderboards ──────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" /> Category Leaderboards
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FANTASY_STATS.map(stat => (
            <StatLeaderboard key={stat.id} stat={stat} standings={standings} />
          ))}
        </div>
      </div>
    </div>
  );
};
