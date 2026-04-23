import React from 'react';
import { Users, Info, TrendingUp, Clock } from 'lucide-react';
import { TEAMS_DATA } from '../../config/data';
import { TEAM_ODDS, ODDS_LAST_UPDATED } from '../../config/odds'; 
import { TeamLogo } from '../TeamLogo';
import { TeamPixelArt } from '../TeamPixelArt'; 

export const TeamsTab = ({ 
  eliminatedTeams, 
  isViewer, 
  getOwnerName, 
  assignments, 
  members, 
  handleAssign, 
  toggleEliminated 
}) => {
  
  // Sort teams so eliminated ones fall safely to the bottom of the grid
  const sortedTeams = [...TEAMS_DATA].sort((a, b) => {
    const aElim = eliminatedTeams[a.id] ? 1 : 0;
    const bElim = eliminatedTeams[b.id] ? 1 : 0;
    if (aElim !== bElim) return aElim - bElim;
    return 0; 
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-4 sm:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b-2 border-green-50 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
              <Users className="w-6 h-6 text-emerald-500" /> Draft & Squad Status
            </h2>
            <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">
              Assign teams to family members. Manage their active status as the tournament progresses.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 self-start sm:self-end shrink-0">
             <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg flex items-center justify-between sm:justify-start gap-3 shadow-sm w-full sm:w-auto">
               <div className="flex items-center gap-1.5">
                 <Info className="w-4 h-4 text-blue-500" />
                 <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">FIFA Ranks: April 2026</span>
               </div>
             </div>
             
             <div className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 shadow-sm w-full sm:w-auto">
               <div className="flex items-center gap-1.5">
                 <TrendingUp className="w-4 h-4 text-purple-500" />
                 <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">DraftKings Odds</span>
               </div>
               <div className="hidden sm:block text-purple-300">|</div>
               <div className="flex items-center gap-1.5 text-purple-600/80">
                 <Clock className="w-3.5 h-3.5" />
                 <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Updated: {ODDS_LAST_UPDATED}</span>
               </div>
             </div>
          </div>
        </div>
        
        {/* Fully Responsive "Trading Card" Grid */}
        <div className="grid grid-cols-2 min-[550px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
          {sortedTeams.map(team => {
            const currentOdds = TEAM_ODDS[team.id] || 'N/A';
            
            return (
              <div 
                key={team.id} 
                className={`group relative flex flex-col justify-between p-2.5 sm:p-4 rounded-2xl border-2 transition-all aspect-square overflow-hidden shadow-sm hover:shadow-md ${eliminatedTeams[team.id] ? 'bg-red-50/90 border-red-200 grayscale opacity-90' : 'bg-white border-green-100 hover:border-emerald-300'}`}
              >
                
                {/* Giant Full-Background Pixel Art */}
                <div className="absolute inset-0 z-0 pointer-events-none transition-transform duration-700 group-hover:scale-105">
                   <TeamPixelArt teamId={team.id} className={`w-full h-full object-cover ${eliminatedTeams[team.id] ? 'opacity-10' : 'opacity-25'}`} />
                   <div className={`absolute inset-0 ${eliminatedTeams[team.id] ? 'bg-red-50/70' : 'bg-gradient-to-t from-white/95 via-white/80 to-white/20'}`}></div>
                </div>

                {/* Top Details (Logo, Name, Badges) */}
                <div className="relative z-10 flex flex-col items-center text-center mt-0 sm:mt-1">
                  <TeamLogo teamId={team.id} className="w-8 h-8 sm:w-12 sm:h-12 bg-white/95 rounded-full p-1 sm:p-1.5 shadow-sm border border-slate-100" />
                  
                  <div className={`font-black text-xs sm:text-base leading-tight mt-1.5 sm:mt-2 ${eliminatedTeams[team.id] ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {team.name}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center gap-1 mt-1.5 sm:mt-2 w-full">
                    {/* Rank & Group Row */}
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/90 px-1.5 py-0.5 rounded border border-slate-100 shadow-sm">
                        Group {team.group}
                      </span>
                      <span className="text-[8px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50/95 border border-emerald-200 px-1.5 py-0.5 rounded shadow-sm">
                        Rank: {team.rank}
                      </span>
                    </div>
                    
                    {/* Vegas Odds Badge! */}
                    <div className="flex items-center justify-center gap-1 w-full mt-0.5">
                      <span className="text-[9px] sm:text-[10px] font-black text-purple-100 uppercase tracking-wider bg-purple-800 border border-purple-900 px-2 py-0.5 rounded shadow-inner w-auto truncate flex items-center gap-1">
                         Odds: <span className="text-yellow-300">{currentOdds}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Bottom Details (Dropdown & Eliminate Button) */}
                <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 mt-auto pt-2 w-full">
                  {isViewer ? (
                     <div className="w-full p-1.5 sm:p-2 text-[10px] sm:text-xs border border-slate-200 rounded bg-white/95 font-bold text-slate-700 text-center truncate shadow-sm">
                       {getOwnerName(team.id)}
                     </div>
                  ) : (
                    <>
                      <select 
                        className="w-full p-1 sm:p-1.5 text-[9px] sm:text-xs border border-slate-200 rounded bg-white/95 font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm cursor-pointer"
                        value={assignments[team.id] || ''}
                        onChange={(e) => handleAssign(team.id, e.target.value)}
                      >
                        <option value="">Manager...</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      
                      <button onClick={() => toggleEliminated(team.id)} 
                              className={`text-[9px] sm:text-[10px] py-1 sm:py-1.5 px-1 rounded font-bold border transition-colors uppercase tracking-wider shadow-sm ${eliminatedTeams[team.id] ? 'bg-white/95 text-green-600 border-green-200 hover:bg-green-50' : 'bg-red-50/95 text-red-600 border-red-200 hover:bg-red-100'}`}>
                        {eliminatedTeams[team.id] ? 'Revive' : 'Eliminate'}
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};