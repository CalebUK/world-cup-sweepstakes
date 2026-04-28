import { useEffect } from 'react';
import { TEAMS_DATA } from '../config/data.js';
import { sortGroupTeams, getThirdPlaceStandings, getR32Mappings } from '../utils/tournamentLogic.js';

export const useTournamentEngine = ({
  matches, setMatches, teamStats, eliminatedTeams, setEliminatedTeams,
  manualRestores, settings, isOwner, isSuperAdmin, saveState, leagueDataReady,
}) => {
  useEffect(() => {
    if (!leagueDataReady) return;
    if (matches.length === 0 || Object.keys(teamStats).length === 0) return;
    let hasMatchesChanges = false;
    let newlyEliminated = false;
    const nextMatches = [...matches];
    const nextEliminations = { ...eliminatedTeams };
    const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    let groupMatchesPlayed = 0; 
    
    groupsList.forEach(g => {
      const gMatches = nextMatches.filter(m => m.stage === 'Group' && TEAMS_DATA.find(t => t.id === m.teamA)?.group === g);
      const playedInGroup = gMatches.filter(m => m.isPlayed).length;
      groupMatchesPlayed += playedInGroup;
      if (gMatches.length === 6 && playedInGroup === 6) {
        const gTeams = Object.values(teamStats).filter(t => t.group === g);
        const sortedGTeams = sortGroupTeams(gTeams, nextMatches, settings); 
        if (sortedGTeams.length === 4) {
          const fourthPlaceId = sortedGTeams[3].id;
          if (!nextEliminations[fourthPlaceId] && !manualRestores[fourthPlaceId]) {
            nextEliminations[fourthPlaceId] = true;
            newlyEliminated = true;
          }
        }
      }
    });

    if (groupMatchesPlayed === 72) {
       const thirdsList = getThirdPlaceStandings(teamStats, nextMatches, settings);
       thirdsList.slice(8).forEach(t => {
          if (!nextEliminations[t.id] && !manualRestores[t.id]) {
             nextEliminations[t.id] = true;
             newlyEliminated = true;
          }
       });
    }

    if (groupMatchesPlayed >= 24) {
        const r32Mappings = getR32Mappings(teamStats, nextMatches, settings);
        r32Mappings.forEach(mapping => {
            const matchIndex = nextMatches.findIndex(m => m.id === mapping.id);
            if (matchIndex !== -1) {
                const tA = mapping.tA || '';
                const tB = mapping.tB || '';
                if (nextMatches[matchIndex].teamA !== tA || nextMatches[matchIndex].teamB !== tB) {
                    nextMatches[matchIndex] = { ...nextMatches[matchIndex], teamA: tA, teamB: tB };
                    hasMatchesChanges = true;
                }
            }
        });
    }

    nextMatches.forEach(m => {
      if (m.nextMatch && m.nextSlot) {
         let winnerId = null;
         if (m.isPlayed && m.teamA && m.teamB) {
           const scoreA = parseInt(m.scoreA);
           const scoreB = parseInt(m.scoreB);
           if (!isNaN(scoreA) && !isNaN(scoreB)) {
             if (scoreA > scoreB) winnerId = m.teamA;
             else if (scoreB > scoreA) winnerId = m.teamB;
             else if (m.isAET) { 
               const pA = parseInt(m.penScoreA);
               const pB = parseInt(m.penScoreB);
               if (!isNaN(pA) && !isNaN(pB)) {
                 if (pA > pB) winnerId = m.teamA;
                 else if (pB > pA) winnerId = m.teamB;
               } else if (m.penWinner) winnerId = m.penWinner;
             }
           }
         }
         const targetMatchIndex = nextMatches.findIndex(x => x.id === m.nextMatch);
         if (targetMatchIndex !== -1) {
            const targetMatch = nextMatches[targetMatchIndex];
            if (targetMatch[m.nextSlot] !== (winnerId || '')) {
               nextMatches[targetMatchIndex] = { ...targetMatch, [m.nextSlot]: (winnerId || '') };
               hasMatchesChanges = true;
            }
         }
      }
    });

    nextMatches.forEach(m => {
      if (m.stage !== 'Group' && m.isPlayed && m.teamA && m.teamB) {
         let loserId = null;
         const scoreA = parseInt(m.scoreA);
         const scoreB = parseInt(m.scoreB);
         if (!isNaN(scoreA) && !isNaN(scoreB)) {
           if (scoreA > scoreB) loserId = m.teamB;
           else if (scoreB > scoreA) loserId = m.teamA;
           else if (m.isAET) {
             const pA = parseInt(m.penScoreA);
             const pB = parseInt(m.penScoreB);
             if (!isNaN(pA) && !isNaN(pB)) {
               if (pA > pB) loserId = m.teamB;
               else if (pB > pA) loserId = m.teamA;
             } else if (m.penWinner) loserId = m.penWinner === m.teamA ? m.teamB : m.teamA;
           }
         }
         if (loserId && !nextEliminations[loserId] && !manualRestores[loserId]) {
            nextEliminations[loserId] = true;
            newlyEliminated = true;
         }
      }
    });

    if (newlyEliminated && isOwner) {
      setEliminatedTeams(nextEliminations);
      saveState('eliminatedTeams', nextEliminations);
    }
    if (hasMatchesChanges && isSuperAdmin) {
      setMatches(nextMatches);
      saveState('matches', nextMatches);
    }
  }, [matches, teamStats, eliminatedTeams, isOwner, isSuperAdmin, settings, manualRestores, leagueDataReady]); // Only re-run when these specific values change
};
