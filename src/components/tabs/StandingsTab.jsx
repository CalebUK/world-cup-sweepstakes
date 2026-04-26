import React from 'react';
import { Medal, Award, Table, Trophy, Info } from 'lucide-react';
import { TeamLogo } from '../TeamLogo.jsx';
import { TEAM_ODDS } from '../../config/odds.js';

export const StandingsTab = ({ settings, awards, memberStats }) => {
  const kidsToShow = settings.kidAwardsType === 'top3' ? (awards.kids?.list || []).slice(0, 3) : (awards.kids?.list || []);
  const showGF = (settings.scoring?.bonus?.perGoal || 0) > 0;
  
  const AwardRow = ({ rank, member, icon, hideRankText }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-slate-100 shadow-sm hover:border-green-200 transition-colors">
      <div className="flex items-center gap-3">
        {icon}
        {!hideRankText && <span className="font-bold text-slate-500 uppercase text-sm tracking-wider">{rank}</span>}
      </div>
      <div className="font-black text-slate-800 text-xl flex-1 text-right sm:text-left pl-2">
        {member ? (
          <div className="flex items-center justify-end sm:justify-start gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <span className="truncate max-w-[120px] sm:max-w-none">{member.name}</span>
            <span className="text-xs sm:text-sm font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200 shrink-0">
              {member.pts} pts
            </span>
          </div>
        ) : '-'}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className={`grid grid-cols-1 ${settings.kidAwards ? 'md:grid-cols-2' : ''} gap-6`}>
        <div className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden flex flex-col">
          <div className="bg-green-800 text-white p-4 font-bold flex items-center gap-2 uppercase tracking-wide shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" /> Overall Awards
          </div>
          <div className="p-4 space-y-4 flex-1 flex flex-col justify-center">
            <AwardRow 
              rank="1st" 
              member={awards.overall['1st']} 
              icon={<img src="/logos/world_cup_trophy.svg" alt="Trophy" className="w-8 h-8 drop-shadow-md shrink-0" />}
            <AwardRow rank="2nd" member={awards.overall['2nd']} icon={<img src="/standings/second.svg" alt="trophy" className="w-6 h-6 drop-shadow-sm shrink-0" />} 
                hideRankText={true}
            <AwardRow rank="3rd" member={awards.overall['3rd']} icon={<img src="/standings/third.svg" alt="trophy" className="w-6 h-6 drop-shadow-sm shrink-0" />} 
                hideRankText={true}

            {settings.woodenSpoon && (
              <AwardRow 
                rank="Wooden Spoon" 
                member={awards.overall['Spoon']} 
                icon={<img src="/standings/woodenspoon.svg" alt="Wooden Spoon" className="w-6 h-6 drop-shadow-sm shrink-0" />} 
                hideRankText={true}
              />
            )}
          </div>
        </div>

        {settings.kidAwards && (
          <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 overflow-hidden flex flex-col">
            <div className="bg-emerald-600 text-white p-4 font-bold flex items-center gap-2 uppercase tracking-wide shrink-0">
              <Award className="w-5 h-5 text-emerald-200" /> Kids Awards
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col justify-center">
              {kidsToShow.length > 0 ? kidsToShow.map((kid, idx) => {
                let iconColor = "text-slate-400";
                if (idx === 0) iconColor = "text-yellow-500";
                else if (idx === 2) iconColor = "text-amber-600";
                else if (idx === 3) iconColor = "text-emerald-500";
                
                return (
                  <AwardRow 
                    key={kid.id} 
                    rank={`${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`} 
                    member={kid} 
                    icon={idx === 0 ? <img src="/logos/world_cup_trophy.svg" alt="Trophy" className="w-7 h-7 drop-shadow-sm shrink-0" /> : <Medal className={`${iconColor} w-6 h-6 shrink-0`}/>} 
                  />
                );
              }) : (
                <div className="text-sm text-slate-500 text-center py-4">No kids assigned yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden">
        <div className="bg-green-50 p-4 font-bold text-green-800 flex items-center gap-2 border-b border-green-200 uppercase tracking-wide">
          <Table className="w-5 h-5" /> Full Standings
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-green-700 text-sm border-b-2 border-green-100">
                <th className="p-4 font-bold uppercase">Rank</th>
                <th className="p-4 font-bold uppercase">Manager</th>
                <th className="p-4 font-bold uppercase text-center">Pts</th>
                <th className="p-4 font-bold uppercase text-center">GD</th>
                {showGF && <th className="p-4 font-bold uppercase text-center text-emerald-600 bg-emerald-50">GF</th>}
                <th className="p-4 font-bold uppercase text-center cursor-help">
                  <div className="flex items-center justify-center gap-1" title="Combined FIFA rankings of remaining teams">
                    Total Rank <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 font-bold uppercase text-center cursor-help text-purple-700">
                  <div className="flex items-center justify-center gap-1" title="Odds of remaining teams">
                    Total Odds <Info className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th className="p-4 font-bold uppercase">Remaining Teams</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.map((member, idx) => {
                const isLastPlace = settings.woodenSpoon && idx === memberStats.length - 1 && memberStats.length > 0;
                
                let sumOdds = 0;
                let hasOdds = false;
                member.teams.filter(t => t.isActive).forEach(t => {
                   const oddsStr = TEAM_ODDS[t.id];
                   if (oddsStr) {
                       const oddsVal = parseInt(oddsStr.replace(/\D/g, ''));
                       if (!isNaN(oddsVal)) {
                           sumOdds += oddsVal;
                           hasOdds = true;
                       }
                   }
                });
                const displayOdds = hasOdds ? (sumOdds > 0 ? `+${sumOdds}` : sumOdds) : 'N/A';

                return (
                  <tr key={member.id} className="border-b border-green-50 last:border-0 hover:bg-green-50/50 transition-colors">
                    <td className="p-4 font-black text-green-800 text-lg">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        {member.name}
                        {isLastPlace && <img src="/standings/woodenspoon.svg" alt="Wooden Spoon" title="Wooden Spoon" className="w-6 h-6 drop-shadow-sm shrink-0" />}
                      </div>
                      {member.isKid && <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">Kid</span>}
                    </td>
                    <td className="p-4 text-center font-black text-2xl text-green-600">{member.pts}</td>
                    <td className="p-4 text-center font-bold text-slate-500">{member.gd > 0 ? `+${member.gd}` : member.gd}</td>
                    {showGF && <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/30">{member.gf}</td>}
                    <td className="p-4 text-center font-bold text-slate-500">{member.totalRank}</td>
                    <td className="p-4 text-center font-bold text-purple-600">{displayOdds}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {member.teams.filter(t => t.isActive).map(t => (
                          <span key={t.id} title={`${t.name} (${t.pts} pts)`} 
                                className="transition-all hover:scale-110">
                             <TeamLogo teamId={t.id} className="w-6 h-6" />
                          </span>
                        ))}
                        {member.teams.filter(t => t.isActive).length === 0 && (
                          <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-2 py-1 rounded">Squad Eliminated</span>
                        )}
                      </div>
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