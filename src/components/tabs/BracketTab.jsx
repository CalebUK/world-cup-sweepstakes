import React, { useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { TEAMS_DATA, KNOCKOUT_STAGES } from '../../config/data.js';
import { TeamLogo } from '../TeamLogo.jsx';

// Left side of the bracket feeds into SF1 → Final
const LEFT_STAGES = {
  R32: ['ko_R32_2', 'ko_R32_5', 'ko_R32_1', 'ko_R32_3', 'ko_R32_11', 'ko_R32_12', 'ko_R32_9', 'ko_R32_10'],
  R16: ['ko_R16_1', 'ko_R16_2', 'ko_R16_5', 'ko_R16_6'],
  QF:  ['ko_QF_1', 'ko_QF_2'],
  SF:  ['ko_SF_1'],
};
// Right side feeds into SF2 → Final (rendered in reverse so it mirrors the left)
const RIGHT_STAGES = {
  R32: ['ko_R32_4', 'ko_R32_6', 'ko_R32_7', 'ko_R32_8', 'ko_R32_14', 'ko_R32_16', 'ko_R32_13', 'ko_R32_15'],
  R16: ['ko_R16_3', 'ko_R16_4', 'ko_R16_7', 'ko_R16_8'],
  QF:  ['ko_QF_3', 'ko_QF_4'],
  SF:  ['ko_SF_2'],
};
const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF'];

const getWinnerId = (m) => {
  if (!m?.isPlayed || !m.teamA || !m.teamB) return null;
  const sA = parseInt(m.scoreA);
  const sB = parseInt(m.scoreB);
  if (sA > sB) return m.teamA;
  if (sB > sA) return m.teamB;
  if (m.isAET) {
    const pA = parseInt(m.penScoreA);
    const pB = parseInt(m.penScoreB);
    if (!isNaN(pA) && !isNaN(pB)) return pA > pB ? m.teamA : m.teamB;
    if (m.penWinner) return m.penWinner;
  }
  return null;
};

const MatchCard = ({ match, members, assignments, highlightMember }) => {
  if (!match) return <div className="flex-1" />;
  const winnerId = getWinnerId(match);

  const TeamRow = ({ teamId, label, score, penScore, isWinner }) => {
    const team = TEAMS_DATA.find(t => t.id === teamId);
    const ownerId = assignments[teamId];
    const owner = members.find(m => m.id === ownerId);
    const isHighlighted = highlightMember && ownerId === highlightMember;

    return (
      <div className={`flex items-center justify-between px-1.5 py-1 border-b last:border-0 border-slate-100 transition-all ${
        isHighlighted ? 'bg-emerald-100' : 'bg-white'
      } ${isWinner ? 'font-black text-slate-900' : 'font-medium text-slate-500'}`}>
        <div className="flex items-center gap-1.5 overflow-hidden w-full pr-2">
          <TeamLogo teamId={teamId} className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] truncate leading-none pt-0.5">
            {team ? team.name : (label || 'TBD')}
          </span>
          {owner && (
            <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 pt-0.5 ${isHighlighted ? 'text-emerald-800' : 'text-emerald-600'}`}>
              — {owner.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(penScore !== undefined && penScore !== '') && (
            <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">({penScore})</span>
          )}
          <span className="text-[11px] font-black w-5 py-0.5 text-center bg-slate-100 rounded leading-none shrink-0">
            {score !== '' ? score : '-'}
          </span>
        </div>
      </div>
    );
  };

  const isHighlighted = highlightMember && (
    assignments[match.teamA] === highlightMember || assignments[match.teamB] === highlightMember
  );

  return (
    <div className={`bg-white rounded-md overflow-hidden border shadow-sm transition-all ${
      isHighlighted
        ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] scale-[1.02] z-10 relative'
        : 'border-slate-200 hover:border-emerald-200'
    }`}>
      <TeamRow teamId={match.teamA} label={match.labelA} score={match.scoreA} penScore={match.isAET ? match.penScoreA : undefined} isWinner={winnerId === match.teamA} />
      <TeamRow teamId={match.teamB} label={match.labelB} score={match.scoreB} penScore={match.isAET ? match.penScoreB : undefined} isWinner={winnerId === match.teamB} />
    </div>
  );
};

// One column of matches for a given stage + side
const BracketColumn = ({ stageId, matchIds, koMatches, members, assignments, highlightMember, labelName }) => {
  const stageMatches = matchIds.map(id => koMatches.find(m => m.id === id));
  return (
    <div className="flex flex-col flex-1 min-w-[150px] max-w-[200px]">
      <div className="text-center mb-3 h-6 shrink-0">
        <span className="bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700 shadow-sm">
          {labelName}
        </span>
      </div>
      <div className="flex-1 flex flex-col">
        {stageMatches.map((m, i) => (
          <div key={m?.id || i} className="flex-1 flex flex-col justify-center px-1 py-1.5">
            <MatchCard match={m} members={members} assignments={assignments} highlightMember={highlightMember} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BracketTab = ({ matches, members, assignments }) => {
  const [highlightMember, setHighlightMember] = useState(() => {
    try { return localStorage.getItem('worldCupBracketHighlight') || ''; } catch { return ''; }
  });

  const handleHighlightChange = (val) => {
    setHighlightMember(val);
    try { localStorage.setItem('worldCupBracketHighlight', val); } catch (e) {}
  };

  const koMatches = matches.filter(m => m.stage !== 'Group');
  const finalMatch = koMatches.find(m => m.id === 'ko_Final_1');
  const stageNames = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinals', SF: 'Semifinals' };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-black text-emerald-800 flex items-center gap-2 uppercase tracking-wide">
          <Trophy className="w-6 h-6 text-yellow-500" /> Tournament Bracket
        </h2>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 w-full sm:w-auto">
          <User className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Highlight:</span>
          <select
            value={highlightMember}
            onChange={(e) => handleHighlightChange(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer ml-1"
          >
            <option value="">None</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Bracket — scrollable on mobile, two halves meeting in middle on desktop */}
      <div className="bg-slate-900 rounded-xl shadow-xl border-2 border-slate-800 overflow-hidden">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center pt-3 pb-1">
          ← Left Half &nbsp;·&nbsp; Right Half →
        </p>
        <div className="p-3 sm:p-5 overflow-x-auto">
          <div className="flex gap-2 sm:gap-3 min-w-[900px] min-h-[700px] items-stretch">

            {/* LEFT HALF — R32 → SF, left-to-right */}
            {STAGE_ORDER.map(stageId => (
              <BracketColumn
                key={`left-${stageId}`}
                stageId={stageId}
                matchIds={LEFT_STAGES[stageId]}
                koMatches={koMatches}
                members={members}
                assignments={assignments}
                highlightMember={highlightMember}
                labelName={stageNames[stageId]}
              />
            ))}

            {/* FINAL — centre column */}
            <div className="flex flex-col flex-1 min-w-[150px] max-w-[200px]">
              <div className="text-center mb-3 h-6 shrink-0">
                <span className="bg-yellow-600 text-yellow-100 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Final 🏆
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center px-1 py-1.5">
                <MatchCard match={finalMatch} members={members} assignments={assignments} highlightMember={highlightMember} />
              </div>
            </div>

            {/* RIGHT HALF — SF → R32, right-to-left (reversed so it mirrors) */}
            {[...STAGE_ORDER].reverse().map(stageId => (
              <BracketColumn
                key={`right-${stageId}`}
                stageId={stageId}
                matchIds={RIGHT_STAGES[stageId]}
                koMatches={koMatches}
                members={members}
                assignments={assignments}
                highlightMember={highlightMember}
                labelName={stageNames[stageId]}
              />
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-[10px] text-center pb-3">Scroll horizontally to see the full bracket</p>
      </div>
    </div>
  );
};
