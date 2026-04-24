import React, { useState } from 'react';
import { Info, Filter, ArrowUpDown, ShieldAlert } from 'lucide-react';
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
  // Local storage states for filters
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

  // Filter Logic
  let displayedTeams = TEAMS_DATA;
  if (managerFilter !== 'All') {
    if (managerFilter === 'Unassigned') {
      displayedTeams = displayedTeams.filter(t => !assignments[t.id]);
    } else {
      displayedTeams = displayedTeams.filter(t => assignments[t.id] === managerFilter);
    }
  }

  // Sort Logic
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
      
      {/* Instructional Banner */}
      {!isViewer && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm sm:text-base font-bold text-blue-800 leading-relaxed">
            Please assign teams to their respective managers (as listed in the settings) in line with how they were drawn (from a hat, randomiser, penalties etc).
          </p>
        </div>
      )}

      {/* Control Bar */}
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
            <option value="Group">Group (A-Z)</option>
            <option value="Rank">FIFA Ranking (High to Low)</option>
            <option value="Odds">Tournament Odds</option>
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedTeams.map(team => {
          const isEliminated = eliminatedTeams[team.id];
          const oddsStr = TEAM_ODDS[team.id];
          
          return (
            <div key={team.id} className={`group relative bg-white rounded-2xl border-2 transition-all shadow-md flex flex-col overflow-hidden ${
              isEliminated ? 'border-red-200 opacity-80 grayscale' : 'border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1.5'
            }`}>
              
              {/* TOP HALF: The Un-blurred Art Gallery! */}
              <div className="relative w-full aspect-square bg-slate-100 overflow-hidden border-b border-slate-200">
                
                {/* Full visibility pixel art filling the square */}
                <TeamPixelArt teamId={team.id} className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />

                {/* Dark gradient overlay solely at the bottom to make the white text pop */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

                {isEliminated && (
                  <div className="absolute top-3 right-3 text-[10px] font-black uppercase bg-red-600 text-white px-2.5 py-1 rounded shadow-md tracking-widest z-10">
                    Eliminated
                  </div>
                )}
                
                {/* Team Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3 z-10">
                  <TeamLogo teamId={team.id} className="w-14 h-14 shrink-0 drop-shadow-xl border-2 border-white/20 rounded-full" />
                  <div className="flex flex-col truncate mb-1">
                    <span className="font-black text-white text-2xl truncate drop-shadow-md">{team.name}</span>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/30">Grp {team.group}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/80 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-emerald-400/50">Rank {team.rank}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM HALF: Crisp, White Controls */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4 bg-white relative z-10">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Winning Odds</span>
                  <span className="font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">{oddsStr || 'N/A'}</span>
                </div>

                <div className="space-y-3">
                  {isViewer ? (
                    <div className="w-full text-center py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-emerald-800">
                      {assignments[team.id] ? members.find(m => m.id === assignments[team.id])?.name : 'Unassigned'}
                    </div>
                  ) : (
                    <select 
                      value={assignments[team.id] || ''} 
                      onChange={(e) => handleAssign(team.id, e.target.value)}
                      className="w-full p-3 border-2 border-emerald-200 rounded-xl text-sm font-black text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer shadow-sm transition-all"
                    >
                      <option value="">-- Assign Manager --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}

                  {!isViewer && (
                    <button
                      onClick={() => toggleEliminated(team.id)}
                      className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all border-2 ${
                        isEliminated 
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                          : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-500'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      {isEliminated ? 'Restore Team' : 'Mark Eliminated'}
                    </button>
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