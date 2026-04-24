import React, { useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { TEAMS_DATA, KNOCKOUT_STAGES } from '../../config/data.js';
import { TeamLogo } from '../TeamLogo.jsx';

// This exact mapping guarantees the visual tree aligns perfectly, feeding correctly into the next round!
const VISUAL_ORDER = {
  R32: ['ko_R32_2', 'ko_R32_5', 'ko_R32_1', 'ko_R32_3', 'ko_R32_11', 'ko_R32_12', 'ko_R32_9', 'ko_R32_10', 'ko_R32_4', 'ko_R32_6', 'ko_R32_7', 'ko_R32_8', 'ko_R32_14', 'ko_R32_16', 'ko_R32_13', 'ko_R32_15'],
  R16: ['ko_R16_1', 'ko_R16_2', 'ko_R16_5', 'ko_R16_6', 'ko_R16_3', 'ko_R16_4', 'ko_R16_7', 'ko_R16_8'],
  QF: ['ko_QF_1', 'ko_QF_2', 'ko_QF_3', 'ko_QF_4'],
  SF: ['ko_SF_1', 'ko_SF_2'],
  Final: ['ko_Final_1']
};

export const BracketTab = ({ matches, members, assignments }) => {
  // Saves your highlight choice so it remembers it when you refresh!
  const [highlightMember, setHighlightMember] = useState(() => {
    return localStorage.getItem('worldCupBracketHighlight') || '';
  });

  const handleHighlightChange = (val) => {
    setHighlightMember(val);
    localStorage.setItem('worldCupBracketHighlight', val);
  };

  const koMatches = matches.filter(m => m.stage !== 'Group');

  const BracketTeam = ({ teamId, label, score, isWinner }) => {
    const team = TEAMS_DATA.find(t => t.id === teamId);
    const ownerId = assignments[teamId];
    const owner = members.find(m => m.id === ownerId);
    const isHighlighted = highlightMember && ownerId === highlightMember;
    
    return (
      <div className={`flex items-center justify-between px-2 py-1.5 border-b last:border-0 border-slate-100 transition-all ${
        isHighlighted ? 'bg-emerald-100' : 'bg-white'
      } ${isWinner ? 'font-black text-slate-900' : 'font-medium text-slate-500'}`}>
        
        {/* ULTRA COMPACT INLINE LAYOUT: Logo - Team Name - Owner */}
        <div className="flex items-center gap-1.5 overflow-hidden w-full pr-2">
          <TeamLogo teamId={teamId} className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] truncate leading-none mt-0.5">
            {team ? team.name : (label || 'TBD')}
          </span>
          {owner && (
            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${isHighlighted ? 'text-emerald-800' : 'text-emerald-600'}`}>
              - {owner.name}
            </span>
          )}
        </div>

        {/* COMPACT SCORE */}
        <span className="text-[10px] font-black w-4 py-0.5 text-center bg-slate-100 rounded leading-none shrink-0">
          {score !== '' ? score : '-'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Bracket Controls */}
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
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bracket Visualizer (Shrunken Symmetrical Pyramid with Gaps) */}
      <div className="bg-slate-900 rounded-xl shadow-xl border-2 border-slate-800 overflow-hidden relative">
        <div className="p-3 sm:p-5 overflow-x-auto">
          
          {/* Shrunk the overall height to fit on screen easier! */}
          <div className="flex gap-4 sm:gap-6 min-w-[850px] min-h-[850px]">
            
            {KNOCKOUT_STAGES.map((stage) => {
              const orderedIds = VISUAL_ORDER[stage.id] || [];
              const stageMatches = orderedIds.map(id => koMatches.find(m => m.id === id)).filter(Boolean);

              if (stageMatches.length === 0) return null;

              return (
                <div key={stage.id} className="flex flex-col flex-1 min-w-[170px]">
                  
                  {/* Column Header */}
                  <div className="text-center mb-2 shrink-0 h-6">
                    <span className="bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700 shadow-sm">
                      {stage.name}
                    </span>
                  </div>

                  {/* Matches Container - Flex evenly distributes the boxes to form the pyramid! */}
                  <div className="flex-1 flex flex-col">
                    {stageMatches.map(m => {
                      let winnerId = null;
                      if (m.isPlayed && m.teamA && m.teamB) {
                        const sA = parseInt(m.scoreA);
                        const sB = parseInt(m.scoreB);
                        if (sA > sB) winnerId = m.teamA;
                        else if (sB > sA) winnerId = m.teamB;
                        else if (m.penWinner) winnerId = m.penWinner;
                      }

                      const isHighlighted = highlightMember && (assignments[m.teamA] === highlightMember || assignments[m.teamB] === highlightMember);

                      return (
                        // THIS py-1.5 GUARANTEES THE BOXES WILL NEVER TOUCH EACH OTHER
                        <div key={m.id} className="flex-1 flex flex-col justify-center px-1 py-1.5">
                          <div className="relative group">
                            <div className={`bg-white rounded-lg overflow-hidden border shadow-sm transition-all ${
                              isHighlighted ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] scale-105 z-10 relative' : 'border-slate-200 hover:border-emerald-200'
                            }`}>
                              <BracketTeam teamId={m.teamA} label={m.labelA} score={m.scoreA} isWinner={winnerId === m.teamA} />
                              <BracketTeam teamId={m.teamB} label={m.labelB} score={m.scoreB} isWinner={winnerId === m.teamB} />
                              
                              {/* Penalty Indicator Overlay */}
                              {m.isPlayed && m.penWinner && (
                                <div className="absolute top-1/2 right-1 -translate-y-1/2 bg-amber-100 text-amber-800 text-[7px] font-black px-1 py-0.5 rounded border border-amber-200 shadow-sm">
                                  PEN
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>

    </div>
  );
};