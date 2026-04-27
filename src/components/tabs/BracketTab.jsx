import React, { useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { TeamLogo } from '../TeamLogo.jsx';

// Left side feeds into SF1 → Final
const LEFT_STAGES = {
  R32: ['ko_R32_2', 'ko_R32_5', 'ko_R32_1', 'ko_R32_3', 'ko_R32_11', 'ko_R32_12', 'ko_R32_9', 'ko_R32_10'],
  R16: ['ko_R16_1', 'ko_R16_2', 'ko_R16_5', 'ko_R16_6'],
  QF:  ['ko_QF_1', 'ko_QF_2'],
  SF:  ['ko_SF_1'],
};
// Right side feeds into SF2 → Final (rendered reversed so it mirrors left)
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

const formatMatchDate = (datetime) => {
  if (!datetime) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(datetime));
  } catch {
    return null;
  }
};

const TeamRow = ({ teamId, label, score, penScore, isWinner, isHighlighted, owner }) => {
  const shortName = teamId || (label ? label.slice(0, 3).toUpperCase() : 'TBD');

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b last:border-0 border-slate-100 transition-all ${
      isHighlighted ? 'bg-emerald-50' : 'bg-white'
    }`}>
      {/* Logo */}
      <TeamLogo teamId={teamId} className="w-4 h-4 shrink-0" />

      {/* 3-letter team code — fixed width so owner always starts at same x */}
      <span className={`text-[11px] w-8 shrink-0 leading-none ${isWinner ? 'font-black text-slate-900' : 'font-medium text-slate-400'}`}>
        {shortName}
      </span>

      {/* Owner name — takes up remaining space */}
      <span className={`text-[10px] flex-1 min-w-0 truncate leading-none ${
        isHighlighted ? 'text-emerald-700 font-black' : 'text-slate-500 font-medium'
      }`}>
        {owner ? owner.name : ''}
      </span>

      {/* Pen score badge — only shown when in AET */}
      {penScore !== undefined && penScore !== '' && (
        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 leading-none shrink-0">
          ({penScore})
        </span>
      )}

      {/* Score box */}
      <span className={`text-[11px] font-black w-5 h-5 flex items-center justify-center rounded leading-none shrink-0 ${
        isWinner ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {score !== '' && score !== undefined ? score : '-'}
      </span>
    </div>
  );
};

const MatchCard = ({ match, members, assignments, highlightMember }) => {
  if (!match) return <div className="flex-1" />;

  const winnerId = getWinnerId(match);
  const dateStr = formatMatchDate(match.datetime);

  const ownerA = members.find(m => m.id === assignments[match.teamA]);
  const ownerB = members.find(m => m.id === assignments[match.teamB]);
  const highlightA = highlightMember && assignments[match.teamA] === highlightMember;
  const highlightB = highlightMember && assignments[match.teamB] === highlightMember;
  const isHighlighted = highlightA || highlightB;

  return (
    <div className={`rounded-lg overflow-hidden border shadow-sm transition-all ${
      isHighlighted
        ? 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] scale-[1.01] z-10 relative'
        : 'border-slate-200 hover:border-emerald-200'
    }`}>
      {dateStr && (
        <div className="bg-slate-700 text-slate-300 text-[9px] font-bold px-2 py-0.5 text-center leading-tight">
          {dateStr}
        </div>
      )}
      {match.isAET && (
        <div className="bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 text-center uppercase tracking-widest">
          After Extra Time
        </div>
      )}
      <TeamRow
        teamId={match.teamA} label={match.labelA}
        score={match.scoreA} penScore={match.isAET ? match.penScoreA : undefined}
        isWinner={winnerId === match.teamA} isHighlighted={highlightA} owner={ownerA}
      />
      <TeamRow
        teamId={match.teamB} label={match.labelB}
        score={match.scoreB} penScore={match.isAET ? match.penScoreB : undefined}
        isWinner={winnerId === match.teamB} isHighlighted={highlightB} owner={ownerB}
      />
    </div>
  );
};

const BracketColumn = ({ stageId, matchIds, koMatches, members, assignments, highlightMember, labelName }) => {
  const stageMatches = matchIds.map(id => koMatches.find(m => m.id === id));
  return (
    <div className="flex flex-col flex-1 min-w-[220px] max-w-[260px]">
      <div className="text-center mb-3 h-6 shrink-0">
        <span className="bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700 shadow-sm">
          {labelName}
        </span>
      </div>
      <div className="flex-1 flex flex-col">
        {stageMatches.map((m, i) => (
          <div key={m?.id || i} className="flex-1 flex flex-col justify-center px-1 py-2">
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

      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-black text-emerald-800 flex items-center gap-2 uppercase tracking-wide">
          <Trophy className="w-6 h-6 text-yellow-500" /> Knockout Stage
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

      <div className="bg-slate-900 rounded-xl shadow-xl border-2 border-slate-800 overflow-hidden">
        <div className="p-3 sm:p-5 overflow-x-auto">
          <div className="flex gap-2 sm:gap-3 min-w-[1800px] min-h-[900px] items-stretch">

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

            <div className="flex flex-col flex-1 min-w-[220px] max-w-[260px]">
              <div className="text-center mb-3 h-6 shrink-0">
                <span className="bg-yellow-600 text-yellow-100 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  Final 🏆
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center px-1 py-2">
                <MatchCard match={finalMatch} members={members} assignments={assignments} highlightMember={highlightMember} />
              </div>
            </div>

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
      </div>
    </div>
  );
};
