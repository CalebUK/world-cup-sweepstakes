import React, { useState } from 'react';
import { Info, Filter, ArrowUpDown, ShieldAlert, ShieldX } from 'lucide-react';
import { TEAMS_DATA } from '../../config/data.js';
import { TEAM_ODDS } from '../../config/odds.js';
import { TeamLogo } from '../TeamLogo.jsx';
import { TeamPixelArt } from '../TeamPixelArt.jsx';

export const TeamsTab = ({ 
  eliminatedTeams, 
  isViewer, 
  assignments, 
  members, 
  handleAssign, 
  toggleEliminated 
}) => {
  const [managerFilter, setManagerFilter] = useState(() => {
    return localStorage.getItem('worldCupTeamsFilter') || 'All';
  });
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('worldCupTeamsSort') || 'Group';
  });

  const handleFilterChange = (val) => {
    setManagerFilter(val);
    localStorage.setItem('worldCupTeamsFilter', val);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    localStorage.setItem('worldCupTeamsSort', val);
  };

  let displayedTeams = TEAMS_DATA;
  if (managerFilter !== 'All') {
    if (managerFilter === 'Unassigned') {
      displayedTeams = displayedTeams.filter(t => !assignments[t.id]);
    } else {
      displayedTeams = displayedTeams.filter(t => assignments[t.id] === managerFilter);
    }
  }

  displayedTeams = [...displayedTeams].sort((a, b) => {
    if (sortBy === 'Group') {
      if (a.group === b.group) return a.name.localeCompare(b.name);
      return a.group.localeCompare(b.group);
    }
    if (sortBy === 'Rank') {
      return (a.rank || 999) - (b.rank || 999);
    }
    if (sortBy === 'Odds') {
      const getOddsVal = (id) => {
        const str = TEAM_ODDS[id];
        if (!str) return 999999;
        const val = parseInt(str.replace(/\D/g, ''));
        return isNaN(val) ? 999999 : val;
      };
      return getOddsVal(a.id) - getOddsVal(b.id);
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {!isViewer && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm sm:text-base font-bold text-blue-800 leading-relaxed">
            Please assign teams to their respective managers (as listed in the settings) in line with how they were drawn (from a hat, randomiser, penalties etc).
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-100 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Manager:</span>
          <select 
            value={managerFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="bg-transparent text-sm font-black text-emerald-800 focus:outline-none w-full cursor-pointer"
          >
            <option value="All">All Teams</option>
            <option value="Unassigned">Unassigned Teams</option>
            <option disabled>──────────</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}'s Teams</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Sort By:</span>
          <select 
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-transparent text-sm font-black text-emerald-800 focus:outline-none w-full cursor-pointer"
          >
            <option value="Group">Group</option>
            <option value="Rank">FIFA Ranking (High to Low)</option>
            <option value="Odds">Tournament Odds</option>
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {displayedTeams.map(team => {
          const isEliminated = eliminatedTeams[team.id];
          const oddsStr = TEAM_ODDS[team.id];
          
          return (
            <div key={team.id} className={`group relative aspect-square rounded-2xl border-2 transition-all shadow-md flex flex-col overflow-hidden ${
              isEliminated ? 'border-red-200 opacity-80 grayscale' : 'border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1'
            }`}>
              
              {/* THE ARTWORK BACKGROUND: Dropped to 60% opacity */}
              <div className="absolute inset-0 z-0 bg-slate-800">
                <TeamPixelArt teamId={team.id} className="w-full h-full object-cover object-center opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/40 to-slate-900/95"></div>
              </div>

              {isEliminated && (
                <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-[10px] font-black uppercase tracking-widest z-20 shadow-md">
                  Eliminated
                </div>
              )}
              
              {/* TOP/MIDDLE: Centered Logo and Wrapped Team Name */}
              <div className="relative z-10 flex flex-col items-center justify-center pt-5 sm:pt-8 flex-1 px-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full p-2 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] mb-2 sm:mb-3 shrink-0">
                  <TeamLogo teamId={team.id} className="w-full h-full object-contain" />
                </div>
                
                {/* line-clamp-2 allows long names like Bosnia and Herzegovina to stack cleanly */}
                <span className="font-black text-white text-base sm:text-2xl text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-1 w-full line-clamp-2">
                  {team.name}
                </span>
              </div>

              {/* BOTTOM: Stats and Controls */}
              <div className="relative z-10 flex flex-col gap-2 p-2 sm:p-3 mt-auto w-full">
                
                {/* Single Row: Group, Rank, Odds - Reduced to text-[7px] on mobile to guarantee fitting! */}
                <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 w-full flex-nowrap px-0.5">
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-slate-800 px-1 py-0.5 sm:py-1 rounded shadow-sm whitespace-nowrap shrink-0">
                    Group {team.group}
                  </span>
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-emerald-800 px-1 py-0.5 sm:py-1 rounded shadow-sm whitespace-nowrap shrink-0">
                    Rank {team.rank}
                  </span>
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-sm text-purple-800 px-1 py-0.5 sm:py-1 rounded shadow-sm whitespace-nowrap shrink-0">
                    Odds {oddsStr || 'N/A'}
                  </span>
                </div>

                {/* Controls: Manager Dropdown & Eliminate Button */}
                <div className="flex items-center gap-1.5 sm:gap-2 w-full pb-1">
                  {isViewer ? (
                    <div className="flex-1 text-center py-2 bg-white/95 backdrop-blur-md border border-white/50 rounded-lg font-black text-[11px] sm:text-xs text-emerald-800 shadow-sm truncate px-2">
                      {assignments[team.id] ? members.find(m => m.id === assignments[team.id])?.name : 'Unassigned'}
                    </div>
                  ) : (
                    <>
                      <select 
                        value={assignments[team.id] || ''} 
                        onChange={(e) => handleAssign(team.id, e.target.value)}
                        className="flex-1 py-2 px-2 border-0 rounded-lg text-[11px] sm:text-xs font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white/95 backdrop-blur-md cursor-pointer shadow-sm min-w-0"
                      >
                        <option value="">-- Assign --</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => toggleEliminated(team.id)}
                        title={isEliminated ? "Restore Team" : "Mark Eliminated"}
                        className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-lg font-bold transition-all shadow-sm backdrop-blur-md ${
                          isEliminated 
                            ? 'bg-red-500/90 text-white hover:bg-red-600' 
                            : 'bg-white/90 text-slate-400 hover:text-red-500 hover:bg-white'
                        }`}
                      >
                        {isEliminated ? <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" /> : <ShieldX className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </>
                  )}
                </div>

              </div>

            </div>
          );
        })}
        {displayedTeams.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold text-lg">
            No teams found for this filter.
          </div>
        )}
      </div>

    </div>
  );
};