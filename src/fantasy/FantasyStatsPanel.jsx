// src/fantasy/FantasyStatsPanel.jsx
//
// Collapsible drawer that hangs off the bottom of a MatchRow when fantasy
// mode is on. Lets the commish enter the 4 fantasy stats (goals, shots on
// target, yellows, reds) for each side of a played match.
//
// Behaviour:
//   - Goals auto-suggest from the existing match.scoreA / match.scoreB but
//     are still editable here. A small note tells the user we copied the
//     score; if they edit it, the note disappears. (We never write back to
//     the match score from here — fantasy stats live on a separate doc.)
//   - When match.isPlayed flips off, the panel hides.
//   - Viewers see read-only values; only the commish can edit.
//
// The component is purely presentational. It receives the per-match stat
// blob and a single setter; persistence is the parent's problem.

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { TEAMS_DATA } from '../config/data.js';

const NumberInput = ({ value, onChange, disabled, label }) => {
  const num = parseInt(value);
  const display = isNaN(num) ? '' : num;
  return (
    <input
      type="number"
      min="0"
      value={display}
      disabled={disabled}
      placeholder="0"
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`w-full text-center bg-slate-50 border border-slate-200 rounded-md font-black text-slate-800 py-1 px-1.5 focus:border-purple-500 focus:bg-white focus:outline-none transition-all text-sm
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    />
  );
};

const TeamSection = ({
  teamId,
  side,             // 'teamA' | 'teamB'
  matchScore,       // number-string from the match (scoreA / scoreB)
  stats,            // { goals, shotsOnTarget, yellows, reds }
  isViewer,
  onChange,         // (field, value) => void
}) => {
  const team = TEAMS_DATA.find(t => t.id === teamId);
  if (!team) return null;

  // If the user hasn't entered goals for this side yet AND the match has a
  // score, show the score as the placeholder hint. If they've explicitly
  // entered a value (even 0) we use that.
  const goalsValue = stats?.goals;
  const goalsHasUserValue = goalsValue !== undefined && goalsValue !== null && goalsValue !== '';
  const goalsDisplay = goalsHasUserValue ? goalsValue : (matchScore ?? '');
  const goalsAutoFilled = !goalsHasUserValue && (matchScore !== '' && matchScore !== undefined && matchScore !== null);

  return (
    <div className="bg-white/95 rounded-lg border border-purple-100 p-2 sm:p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2 min-w-0">
        <span className="text-[9px] sm:text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-1.5 py-0.5 rounded shrink-0">
          {team.id}
        </span>
        <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
          {team.name}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Goals</span>
          <NumberInput
            value={goalsDisplay}
            onChange={(v) => onChange('goals', v)}
            disabled={isViewer}
            label={`${team.name} goals`}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">SoT</span>
          <NumberInput
            value={stats?.shotsOnTarget}
            onChange={(v) => onChange('shotsOnTarget', v)}
            disabled={isViewer}
            label={`${team.name} shots on target`}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider text-center">Yel</span>
          <NumberInput
            value={stats?.yellows}
            onChange={(v) => onChange('yellows', v)}
            disabled={isViewer}
            label={`${team.name} yellow cards`}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-red-600 uppercase tracking-wider text-center">Red</span>
          <NumberInput
            value={stats?.reds}
            onChange={(v) => onChange('reds', v)}
            disabled={isViewer}
            label={`${team.name} red cards`}
          />
        </div>
      </div>
      {goalsAutoFilled && (
        <p className="text-[9px] text-slate-400 italic mt-1.5 text-center">
          Goals copied from match score
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const FantasyStatsPanel = ({
  match,
  matchStats,        // { teamA: {...}, teamB: {...} } | undefined
  isViewer,
  updateMatchStat,   // (matchId, side, field, value) => void
}) => {
  const [open, setOpen] = useState(false);

  // Defensive: don't render if the match isn't played yet
  if (!match.isPlayed) return null;

  const a = matchStats?.teamA || {};
  const b = matchStats?.teamB || {};

  // Has anything been entered? (used for the closed-state summary)
  const anyEntered = useMemo(() => {
    const fields = ['goals', 'shotsOnTarget', 'yellows', 'reds'];
    return fields.some(f =>
      (a[f] !== undefined && a[f] !== '' && a[f] !== null) ||
      (b[f] !== undefined && b[f] !== '' && b[f] !== null)
    );
  }, [a, b]);

  const handleChange = (side, field, value) => {
    if (isViewer) return;
    updateMatchStat(match.id, side, field, value);
  };

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg transition-colors group"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-black text-purple-800 uppercase tracking-widest">
            Fantasy Stats
          </span>
          {!anyEntered && !isViewer && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" /> Not entered
            </span>
          )}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 text-purple-500" />
          : <ChevronRight className="w-4 h-4 text-purple-500" />
        }
      </button>

      {open && (
        <div className="mt-2 p-3 bg-purple-50/50 border-2 border-purple-100 rounded-xl">
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <TeamSection
              teamId={match.teamA}
              side="teamA"
              matchScore={match.scoreA}
              stats={a}
              isViewer={isViewer}
              onChange={(field, value) => handleChange('teamA', field, value)}
            />
            <TeamSection
              teamId={match.teamB}
              side="teamB"
              matchScore={match.scoreB}
              stats={b}
              isViewer={isViewer}
              onChange={(field, value) => handleChange('teamB', field, value)}
            />
          </div>
          {!isViewer && (
            <p className="text-[10px] text-slate-500 italic mt-2 text-center">
              Cards penalty in Roto: yellow = 1, red = 3. Second-yellow dismissals count as a red only.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
