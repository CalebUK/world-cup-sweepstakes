import React, { useState } from 'react';
import { Trophy, User } from 'lucide-react';
import { TEAMS_DATA, KNOCKOUT_STAGES } from '../../config/data.js';
import { TeamLogo } from '../TeamLogo.jsx';

export const BracketTab = ({ matches, members, assignments }) => {
  const [highlightMember, setHighlightMember] = useState('');

  // Extract only knockout matches
  const koMatches = matches.filter(m => m.stage !== 'Group');

  // Helper to render a single team slot in the bracket
  const BracketTeam = ({ teamId, label, score, isWinner }) => {
    const team = TEAMS_DATA.find(t => t.id === teamId);
    const isHighlighted = highlightMember && assignments[teamId] === highlightMember;
    
    return (
      <div className={`flex items-center justify-between p-1.5 border-b last:border-0 border-slate-100 transition-all ${
        isHighlighted ? 'bg-emerald-100' : 'bg-white'
      } ${isWinner ? 'font-black text-slate-900' : 'font-medium text-slate-500'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <TeamLogo teamId={teamId} className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate max-w-[100px] sm:max-w-[120px]">
            {team ? team.name : (label || 'TBD')}
          </span>
        </div>
        <span className="text-xs ml-2 w-4 text-center bg-slate-100 rounded">
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
            onChange={(e) => setHighlightMember(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer ml-1"
          >
            <option value="">None</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bracket Visualizer (Scrollable Horizontally) */}
      <div className="bg-slate-900 rounded-xl shadow-xl border-2 border-slate-800 overflow-hidden relative">
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-8 min-w-[1000px]">
            
            {KNOCKOUT_STAGES.map((stage, index) => {
              // Sort matches by the numeric ID so they flow linearly down the column
              const stageMatches = koMatches
                .filter(m => m.stage === stage.id)
                .sort((a, b) => parseInt(a.id.split('_')[2]) - parseInt(b.id.split('_')[2]));

              if (stageMatches.length === 0) return null;

              return (
                <div key={stage.id} className="flex flex-col justify-around flex-1 min-w-[180px] gap-4 relative">
                  {/* Column Header */}
                  <div className="text-center mb-4">
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700">
                      {stage.name}
                    </span>
                  </div>

                  {/* Matches */}
                  {stageMatches.map(m => {
                    // Determine if there is a winner to bold their text
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
                      <div key={m.id} className="relative group">
                        <div className={`bg-white rounded-lg overflow-hidden border-2 shadow-sm transition-all ${
                          isHighlighted ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)] scale-105 z-10 relative' : 'border-slate-200'
                        }`}>
                          <BracketTeam teamId={m.teamA} label={m.labelA} score={m.scoreA} isWinner={winnerId === m.teamA} />
                          <BracketTeam teamId={m.teamB} label={m.labelB} score={m.scoreB} isWinner={winnerId === m.teamB} />
                          
                          {/* Penalty Indicator Overlay */}
                          {m.isPlayed && m.penWinner && (
                            <div className="absolute top-1/2 right-1 -translate-y-1/2 bg-amber-100 text-amber-800 text-[8px] font-black px-1 rounded border border-amber-200">
                              PEN
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </div>

    </div>
  );
};