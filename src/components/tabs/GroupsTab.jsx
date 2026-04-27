import React from 'react';
import { Table } from 'lucide-react';
import { TeamLogo } from '../TeamLogo';
import { getThirdPlaceStandings, sortGroupTeams } from '../../utils/tournamentLogic';

export const GroupsTab = ({ teamStats, matches, settings }) => {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Calculate total FIFA rank per group so we can badge the best and worst
  const groupRankTotals = groups.map(g => {
    const total = Object.values(teamStats)
      .filter(t => t.group === g)
      .reduce((sum, t) => sum + (t.rank || 0), 0);
    return { group: g, total };
  });
  const maxRank = Math.max(...groupRankTotals.map(g => g.total)); // highest number = weakest group
  const minRank = Math.min(...groupRankTotals.map(g => g.total)); // lowest number = strongest group
  const weakestGroup = groupRankTotals.find(g => g.total === maxRank)?.group;
  const strongestGroup = groupRankTotals.find(g => g.total === minRank)?.group;

  const thirds = getThirdPlaceStandings(teamStats, matches, settings);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
          <Table className="w-7 h-7 text-emerald-500" /> Group Stage Standings
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(g => {
          const gTeams = Object.values(teamStats).filter(t => t.group === g);
          const sortedGTeams = sortGroupTeams(gTeams, matches, settings);
          const rankTotal = groupRankTotals.find(x => x.group === g)?.total || 0;
          const isWeakest = g === weakestGroup;
          const isStrongest = g === strongestGroup;

          return (
            <div key={g} className="bg-white rounded-xl shadow-md border-2 border-green-100 overflow-hidden">
              <div className="bg-green-800 text-white p-2 flex items-center justify-between">
                <span className="font-bold uppercase tracking-widest pl-2 flex items-center gap-2">
                  Group {g}
                  {isStrongest && <span title="Strongest group by combined FIFA ranking">☠️</span>}
                  {isWeakest && <span title="Weakest group by combined FIFA ranking">🥱</span>}
                </span>
                <span className="text-[10px] bg-green-900/50 px-2 py-1 rounded border border-green-700/50 font-bold flex items-center gap-1 shadow-sm" title="Combined FIFA Ranking of these 4 teams">
                  Comb. Rank: <span className="text-emerald-300">{rankTotal}</span>
                </span>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-green-50 text-green-800 border-b-2 border-green-100">
                  <tr>
                    <th className="p-1 sm:p-2 text-left uppercase text-xs">Team</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs" title="Played">P</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs hidden min-[350px]:table-cell" title="Wins">W</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs hidden min-[350px]:table-cell" title="Draws">D</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs hidden min-[350px]:table-cell" title="Losses">L</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs" title="Goals For">GF</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs" title="Goals Against">GA</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-[10px] sm:text-xs" title="Goal Difference">GD</th>
                    <th className="p-1 sm:p-2 text-center uppercase text-xs font-black">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGTeams.map((t, idx) => (
                    <tr key={t.id} className={`border-b border-slate-50 last:border-0 ${idx < 2 ? 'bg-green-50/30' : ''}`}>
                      <td className="p-1 sm:p-2 font-bold flex items-center gap-1.5 sm:gap-2">
                        <TeamLogo teamId={t.id} className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="truncate max-w-[60px] sm:max-w-[80px]" title={t.name}>{t.id}</span>
                      </td>
                      <td className="p-1 sm:p-2 text-center text-slate-500 font-medium">{t.groupWins + t.groupDraws + t.groupLosses}</td>
                      <td className="p-1 sm:p-2 text-center text-slate-500 hidden min-[350px]:table-cell">{t.groupWins}</td>
                      <td className="p-1 sm:p-2 text-center text-slate-500 hidden min-[350px]:table-cell">{t.groupDraws}</td>
                      <td className="p-1 sm:p-2 text-center text-slate-500 hidden min-[350px]:table-cell">{t.groupLosses}</td>
                      <td className="p-1 sm:p-2 text-center font-medium text-emerald-600">{t.groupGf}</td>
                      <td className="p-1 sm:p-2 text-center font-medium text-red-500">{t.groupGa}</td>
                      <td className="p-1 sm:p-2 text-center font-bold text-slate-600">{t.groupGd > 0 ? `+${t.groupGd}` : t.groupGd}</td>
                      <td className="p-1 sm:p-2 text-center font-black text-green-700">{t.groupPts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* 3rd Place Rankings */}
      <div className="bg-slate-900 rounded-xl shadow-xl border-2 border-slate-800 overflow-hidden mt-8 max-w-3xl mx-auto">
        <div className="bg-slate-950 text-white p-4 font-black uppercase tracking-widest flex justify-between items-center">
          <span>3rd Place Rankings</span>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded border border-slate-700">Top 8 Advance</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-300 border-b-2 border-slate-700">
              <tr>
                <th className="p-3 text-left uppercase text-xs w-10">#</th>
                {/* Fixed width for Team column so the group badge always starts at same x */}
                <th className="p-3 text-left uppercase text-xs w-48">Team</th>
                <th className="p-3 text-center uppercase text-xs" title="Played">P</th>
                <th className="p-3 text-center uppercase text-xs" title="Goal Difference">GD</th>
                <th className="p-3 text-center uppercase text-xs" title="Goals For">GF</th>
                <th className="p-3 text-center uppercase text-xs font-black">Pts</th>
              </tr>
            </thead>
            <tbody>
              {thirds.map((t, idx) => {
                const isAdvancing = idx < 8;
                return (
                  <tr key={t.id} className={`border-b border-slate-900 last:border-0 transition-colors ${isAdvancing ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-red-900 hover:bg-red-800'}`}>
                    <td className="p-3 font-black text-white/60 text-sm">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <TeamLogo teamId={t.id} className="w-5 h-5 bg-white/90 rounded-full p-0.5 shrink-0" />
                        <span title={t.name} className="text-white font-bold w-8 shrink-0">{t.id}</span>
                        {/* Fixed-width badge so all group letters align */}
                        <span className={`inline-flex items-center justify-center w-16 text-[10px] px-1.5 py-0.5 rounded font-black shadow-sm border ${isAdvancing ? 'bg-emerald-950 text-emerald-200 border-emerald-600' : 'bg-red-950 text-red-200 border-red-700'}`}>
                          Group {t.group}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-medium text-white/90">{t.groupWins + t.groupDraws + t.groupLosses}</td>
                    <td className="p-3 text-center font-bold text-white">{t.groupGd > 0 ? `+${t.groupGd}` : t.groupGd}</td>
                    <td className="p-3 text-center font-medium text-white/90">{t.groupGf}</td>
                    <td className="p-3 text-center font-black text-lg text-white">{t.groupPts}</td>
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
