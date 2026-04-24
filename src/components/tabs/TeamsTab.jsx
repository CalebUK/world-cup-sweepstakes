import React, { useState } from 'react';
import { Info, Filter, ArrowUpDown, ShieldAlert } from 'lucide-react';
import { TEAMS_DATA } from '../../config/data.js';
import { TEAM_ODDS } from '../../config/odds.js';
import { TeamLogo } from '../TeamLogo.jsx';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedTeams.map(team => {
          const isEliminated = eliminatedTeams[team.id];
          const oddsStr = TEAM_ODDS[team.id];
          
          return (
            <div key={team.id} className={`bg-white rounded-xl border-2 transition-all shadow-sm flex flex-col overflow-hidden ${
              isEliminated ? 'border-red-200 opacity-75 grayscale' : 'border-slate-200 hover:border-emerald-300 hover:shadow-md hover:-translate-y-1'
            }`}>
              
              {/* Team Header */}
              <div className="p-4 flex items-center gap-3 border-b border-slate-100 relative">
                {isEliminated && (
                  <div className="absolute top-2 right-2 text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded tracking-widest">
                    Eliminated
                  </div>
                )}
                {/* LOGO IMPORT RESTORED HERE! */}
                <TeamLogo teamId={team.id} className="w-10 h-10 shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="font-black text-slate-800 text-lg truncate">{team.name}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 rounded">Grp {team.group}</span>
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 rounded">Rank {team.rank}</span>
                  </div>
                </div>
              </div>

              {/* Assignments & Controls */}
              <div className="p-4 bg-slate-50 flex-1 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Odds</span>
                  <span className="font-black text-purple-600">{oddsStr || 'N/A'}</span>
                </div>

                <div className="space-y-3">
                  {isViewer ? (
                    <div className="w-full text-center py-2 bg-white border-2 border-slate-200 rounded-lg font-black text-emerald-800 shadow-inner">
                      {assignments[team.id] ? members.find(m => m.id === assignments[team.id])?.name : 'Unassigned'}
                    </div>
                  ) : (
                    <select 
                      value={assignments[team.id] || ''} 
                      onChange={(e) => handleAssign(team.id, e.target.value)}
                      className="w-full p-2 border-2 border-emerald-200 rounded-lg text-sm font-black text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer shadow-sm transition-all"
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
                      className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg font-bold text-sm transition-colors border-2 ${
                        isEliminated 
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                          : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
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
          <div className="col-span-full py-12 text-center text-slate-400 font-bold">
            No teams found for this filter.
          </div>
        )}
      </div>

    </div>
  );
};