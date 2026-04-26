import React from 'react';
import { Trophy, Award, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

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

  const renderAwardsBox = (awardData, title, bgColor, borderColor, iconColor) => {
    if (!awardData) return null;

    const first = sortedStats.find(m => m.id === awardData['1st']?.id);
    const second = sortedStats.find(m => m.id === awardData['2nd']?.id);
    const third = sortedStats.find(m => m.id === awardData['3rd']?.id);

    // Calculate Wooden Spoon dynamically based on the current group (Overall vs Kids)
    let spoon = null;
    if (settings?.woodenSpoon) {
       const targetList = title.includes("Kids") ? kidsStats : sortedStats;
       if (targetList.length > 0) {
          const potentialSpoon = targetList[targetList.length - 1];
          // Only show spoon if they have actually earned points
          if (potentialSpoon.pts > 0) {
             spoon = potentialSpoon;
          }
       }
    }

    return (
      <div className={`bg-white rounded-xl shadow-md border-2 ${borderColor} p-4 sm:p-6 relative overflow-hidden`}>
        <h2 className={`text-lg font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide`}>
          <Award className={`w-5 h-5 ${iconColor}`} /> {title}
        </h2>
        
        <div className="space-y-3">
          {first && (
            <div className={`flex items-center justify-between p-3 ${bgColor} rounded-lg border border-white/50 shadow-sm`}>
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-sm" />
                <span className="font-black text-slate-800 text-sm sm:text-base">{first.name}</span>
              </div>
              <span className="font-bold text-emerald-700 bg-white px-2 py-1 rounded-md text-xs shadow-sm">{first.pts} pts</span>
            </div>
          )}
          
          {second && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <img src="/standings/second.svg" alt="2nd" className="w-6 h-6 drop-shadow-sm" onError={(e) => e.target.style.display='none'} />
                <span className="font-black text-slate-700 text-sm">{second.name}</span>
              </div>
              <span className="font-bold text-slate-500 text-xs">{second.pts} pts</span>
            </div>
          )}
          
          {third && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <img src="/standings/third.svg" alt="3rd" className="w-6 h-6 drop-shadow-sm" onError={(e) => e.target.style.display='none'} />
                <span className="font-black text-slate-700 text-sm">{third.name}</span>
              </div>
              <span className="font-bold text-slate-500 text-xs">{third.pts} pts</span>
            </div>
          )}
          
          {spoon && (
            <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100/50 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-xl drop-shadow-sm" title="Wooden Spoon">🥄</span>
                <span className="font-black text-amber-900 text-sm">{spoon.name}</span>
              </div>
              <span className="font-bold text-amber-700/70 text-xs">{spoon.pts} pts</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SIDE-BY-SIDE AWARDS BOXES */}
      <div className={`grid grid-cols-1 ${settings?.kidAwards && kidsStats.length > 0 ? 'md:grid-cols-2' : 'max-w-lg mx-auto'} gap-4 sm:gap-6 mb-8`}>
        {renderAwardsBox(awards?.overall, "Overall Standings", "bg-yellow-50", "border-yellow-200", "text-yellow-500")}
        
        {settings?.kidAwards && kidsStats.length > 0 && (
           renderAwardsBox(awards?.kids, "Kids Leaderboard", "bg-sky-50", "border-sky-200", "text-sky-500")
        )}
      </div>

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