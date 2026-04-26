import React from 'react';
import { Trophy, Medal, Award, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export const StandingsTab = ({ settings, awards, memberStats }) => {
  
  // Create a sorted copy of member stats based on current points
  const sortedStats = [...memberStats].sort((a, b) => b.pts - a.pts);
  const kidsStats = sortedStats.filter(m => m.isKid);

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-500';
    if (trend < 0) return 'text-red-500';
    return 'text-slate-300';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ChevronUp className="w-4 h-4" />;
    if (trend < 0) return <ChevronDown className="w-4 h-4" />;
    return <span className="w-4 h-4 flex items-center justify-center">-</span>;
  };

  const renderPodium = (podiumData, title) => {
    if (!podiumData) return null;

    const first = sortedStats.find(m => m.id === podiumData['1st']?.id);
    const second = sortedStats.find(m => m.id === podiumData['2nd']?.id);
    const third = sortedStats.find(m => m.id === podiumData['3rd']?.id);

    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 p-6 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-green-50 rounded-bl-full -z-10 opacity-50"></div>
        <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-wide">
          <Award className="w-6 h-6 text-emerald-600" /> {title}
        </h2>
        
        <div className="flex justify-center items-end gap-2 sm:gap-6 h-56 pt-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center w-1/3 animate-fade-in relative z-10" style={{ animationDelay: '200ms' }}>
            {second ? (
              <>
                <img src="/standings/second.svg" alt="2nd Place" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md mb-2" onError={(e) => e.target.style.display='none'} />
                <div className="font-black text-slate-700 text-sm sm:text-base text-center truncate w-full px-1 mb-1">{second.name}</div>
                <div className="text-xs font-bold text-slate-500 mb-2">{second.pts} pts</div>
                <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 h-28 rounded-t-lg border-2 border-b-0 border-slate-300 shadow-inner flex justify-center pt-2">
                  <span className="font-black text-slate-400 text-2xl">2</span>
                </div>
              </>
            ) : (
              <div className="w-full bg-slate-50 h-28 rounded-t-lg border-2 border-b-0 border-slate-100 flex justify-center pt-2 opacity-50">
                 <span className="font-black text-slate-300 text-2xl">2</span>
              </div>
            )}
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center w-1/3 animate-fade-in relative z-20" style={{ animationDelay: '400ms' }}>
            {first ? (
              <>
                <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] mb-2" />
                <div className="font-black text-slate-900 text-base sm:text-lg text-center truncate w-full px-1 mb-1">{first.name}</div>
                <div className="text-xs font-bold text-emerald-600 mb-2 bg-emerald-50 px-2 py-0.5 rounded-full">{first.pts} pts</div>
                <div className="w-full bg-gradient-to-t from-yellow-400 via-yellow-200 to-yellow-100 h-36 rounded-t-lg border-2 border-b-0 border-yellow-400 shadow-[0_-5px_15px_rgba(250,204,21,0.2)] flex justify-center pt-2">
                  <span className="font-black text-yellow-600 text-3xl">1</span>
                </div>
              </>
            ) : (
              <div className="w-full bg-slate-50 h-36 rounded-t-lg border-2 border-b-0 border-slate-100 flex justify-center pt-2 opacity-50">
                 <span className="font-black text-slate-300 text-3xl">1</span>
              </div>
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center w-1/3 animate-fade-in relative z-10" style={{ animationDelay: '600ms' }}>
            {third ? (
              <>
                <img src="/standings/third.svg" alt="3rd Place" className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-md mb-2" onError={(e) => e.target.style.display='none'} />
                <div className="font-black text-slate-700 text-xs sm:text-sm text-center truncate w-full px-1 mb-1">{third.name}</div>
                <div className="text-xs font-bold text-slate-500 mb-2">{third.pts} pts</div>
                <div className="w-full bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 h-20 rounded-t-lg border-2 border-b-0 border-amber-800 shadow-inner flex justify-center pt-1">
                  <span className="font-black text-amber-900/50 text-2xl">3</span>
                </div>
              </>
            ) : (
              <div className="w-full bg-slate-50 h-20 rounded-t-lg border-2 border-b-0 border-slate-100 flex justify-center pt-1 opacity-50">
                 <span className="font-black text-slate-300 text-2xl">3</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* PODIUMS */}
      {renderPodium(awards?.overall, "Overall Standings")}
      
      {settings?.kidAwards && kidsStats.length > 0 && (
         renderPodium(awards?.kids, "Kids Leaderboard")
      )}

      {/* FULL LEADERBOARD TABLE */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Live Leaderboard
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{sortedStats.length} Managers</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-xs uppercase tracking-widest text-slate-500 font-black border-b-2 border-slate-200">
                <th className="p-4 text-center w-16">Rank</th>
                <th className="p-4">Manager</th>
                <th className="p-4 text-center">Teams</th>
                <th className="p-4 text-center">Alive</th>
                <th className="p-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStats.map((member, index) => {
                const isWoodenSpoon = settings?.woodenSpoon && index === sortedStats.length - 1 && member.pts > 0;
                
                return (
                  <tr key={member.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-sm font-black ${index < 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {index + 1}
                        </span>
                        <div className={`flex items-center justify-center ${getTrendColor(member.trend)}`}>
                          {getTrendIcon(member.trend)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                          {member.name}
                        </span>
                        {member.isKid && (
                          <span className="bg-sky-100 text-sky-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Kid</span>
                        )}
                        {isWoodenSpoon && (
                          <span className="text-lg" title="Wooden Spoon">🥄</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">
                        {member.teamsAssigned}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                        {member.teamsAssigned - member.teamsEliminated}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-lg sm:text-xl font-black text-slate-800">
                        {member.pts}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};