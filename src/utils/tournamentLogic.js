import { TEAMS_DATA, DEFAULT_SCORING } from '../config/data';
import { THIRD_PLACE_MAP } from '../config/thirdPlaceLookup'; 

// --- THE OFFICIAL FIFA GROUP STAGE SORTING ALGORITHM ---
export const sortGroupTeams = (teams, matches, settings) => {
  const scoring = settings?.scoring || { group: { win: 3, draw: 1, loss: 0 } };
  const winPts = scoring.group.win;
  const drawPts = scoring.group.draw;

  const pointGroups = {};
  teams.forEach(t => {
    // STRICTLY USE GROUP POINTS
    if (!pointGroups[t.groupPts]) pointGroups[t.groupPts] = [];
    pointGroups[t.groupPts].push(t);
  });

  let sorted = [];
  const uniquePts = Object.keys(pointGroups).map(Number).sort((a,b) => b - a);

  uniquePts.forEach(pts => {
    const tiedTeams = pointGroups[pts];
    
    if (tiedTeams.length === 1) {
      sorted.push(tiedTeams[0]);
    } else {
      const tiedIds = tiedTeams.map(t => t.id);
      const h2h = {};
      tiedIds.forEach(id => h2h[id] = { pts: 0, gd: 0, gf: 0 });

      matches.forEach(m => {
        if (m.stage === 'Group' && m.isPlayed && tiedIds.includes(m.teamA) && tiedIds.includes(m.teamB)) {
          const scoreA = parseInt(m.scoreA);
          const scoreB = parseInt(m.scoreB);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            h2h[m.teamA].gf += scoreA;
            h2h[m.teamB].gf += scoreB;
            h2h[m.teamA].gd += (scoreA - scoreB);
            h2h[m.teamB].gd += (scoreB - scoreA);
            
            if (scoreA > scoreB) h2h[m.teamA].pts += winPts;
            else if (scoreB > scoreA) h2h[m.teamB].pts += winPts;
            else { h2h[m.teamA].pts += drawPts; h2h[m.teamB].pts += drawPts; }
          }
        }
      });

      tiedTeams.sort((a, b) => {
        if (h2h[b.id].pts !== h2h[a.id].pts) return h2h[b.id].pts - h2h[a.id].pts;
        if (h2h[b.id].gd !== h2h[a.id].gd) return h2h[b.id].gd - h2h[a.id].gd;
        if (h2h[b.id].gf !== h2h[a.id].gf) return h2h[b.id].gf - h2h[a.id].gf;
        
        // FALLBACK TO STRICT GROUP STATS
        if (b.groupGd !== a.groupGd) return b.groupGd - a.groupGd;
        return b.groupGf - a.groupGf;
      });

      sorted.push(...tiedTeams);
    }
  });
  return sorted;
};

// Computes the math for the entire tournament (GD, GF, GA, Points, Awards)
export const calculateStats = (matches, eliminatedTeams, settings, members, assignments) => {
  const scoring = settings.scoring || DEFAULT_SCORING;
  const perGoalPts = scoring.bonus?.perGoal || 0;
  const cleanSheetPts = scoring.bonus?.cleanSheet || 0;

  const tStats = {};
  TEAMS_DATA.forEach(t => {
    tStats[t.id] = { 
      ...t, 
      isActive: !eliminatedTeams[t.id], 
      
      // NEW: Total Sweepstakes Stats (Includes Knockouts & Bonuses)
      pts: 0, totalGd: 0, totalGf: 0, totalGa: 0,
      
      // NEW: Strict FIFA Group Stats (For the Tables)
      groupPts: 0, groupGd: 0, groupGf: 0, groupGa: 0, groupWins: 0, groupDraws: 0, groupLosses: 0 
    };
  });

  let wcWinnerId = null;

  matches.forEach(m => {
    if (!m.isPlayed || !m.teamA || !m.teamB) return;

    const scoreA = parseInt(m.scoreA);
    const scoreB = parseInt(m.scoreB);
    if (isNaN(scoreA) || isNaN(scoreB)) return;

    const isDraw = scoreA === scoreB;
    let winnerId = null;
    let loserId = null;

    if (scoreA > scoreB) { winnerId = m.teamA; loserId = m.teamB; }
    else if (scoreB > scoreA) { winnerId = m.teamB; loserId = m.teamA; }
    else if (isDraw && m.stage !== 'Group' && m.penWinner) {
      winnerId = m.penWinner;
      loserId = m.penWinner === m.teamA ? m.teamB : m.teamA;
    }

    if (tStats[m.teamA] && tStats[m.teamB]) {
      
      // 1. ALWAYS ADD TO OVERALL TOTALS (For the Standings Tab)
      tStats[m.teamA].totalGd += (scoreA - scoreB);
      tStats[m.teamA].totalGf += scoreA;
      tStats[m.teamA].totalGa += scoreB;
      
      tStats[m.teamB].totalGd += (scoreB - scoreA);
      tStats[m.teamB].totalGf += scoreB;
      tStats[m.teamB].totalGa += scoreA;

      // ALWAYS AWARD SWEEPSTAKES BONUS POINTS
      tStats[m.teamA].pts += (scoreA * perGoalPts);
      tStats[m.teamB].pts += (scoreB * perGoalPts);
      if (scoreB === 0) tStats[m.teamA].pts += cleanSheetPts;
      if (scoreA === 0) tStats[m.teamB].pts += cleanSheetPts;

      // 2. STRICT GROUP STAGE ROUTING
      if (m.stage === 'Group') {
        
        tStats[m.teamA].groupGd += (scoreA - scoreB);
        tStats[m.teamA].groupGf += scoreA;
        tStats[m.teamA].groupGa += scoreB;
        
        tStats[m.teamB].groupGd += (scoreB - scoreA);
        tStats[m.teamB].groupGf += scoreB;
        tStats[m.teamB].groupGa += scoreA;

        if (isDraw) {
          // FIFA Points
          tStats[m.teamA].groupPts += scoring.group.draw; tStats[m.teamA].groupDraws += 1;
          tStats[m.teamB].groupPts += scoring.group.draw; tStats[m.teamB].groupDraws += 1;
          // Sweepstakes Points
          tStats[m.teamA].pts += scoring.group.draw;
          tStats[m.teamB].pts += scoring.group.draw;
        } else {
          if (tStats[winnerId]) { 
            tStats[winnerId].groupPts += scoring.group.win; tStats[winnerId].groupWins += 1; 
            tStats[winnerId].pts += scoring.group.win;
          }
          if (tStats[loserId]) { 
            tStats[loserId].groupPts += scoring.group.loss; tStats[loserId].groupLosses += 1; 
            tStats[loserId].pts += scoring.group.loss;
          }
        }
      } else {
        // 3. KNOCKOUT STAGE SWEEPSTAKES POINTS
        const koScoring = scoring.ko[m.stage];
        if (koScoring) {
          if (!isDraw) {
             if (tStats[winnerId]) tStats[winnerId].pts += koScoring.win;
             if (tStats[loserId]) tStats[loserId].pts += koScoring.loss;
          } else {
             if (tStats[winnerId]) tStats[winnerId].pts += koScoring.penWin;
             if (tStats[loserId]) tStats[loserId].pts += koScoring.penLoss;
          }
          if (m.stage === 'Final' && winnerId) wcWinnerId = winnerId;
        }
      }
    }
  });

  if (scoring.group.topOfGroup) {
    const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    groupsList.forEach(g => {
      const gTeams = Object.values(tStats).filter(t => t.group === g);
      const sortedGTeams = sortGroupTeams(gTeams, matches, settings);
      const topTeam = sortedGTeams[0];
      if (topTeam && (topTeam.groupWins + topTeam.groupDraws + topTeam.groupLosses > 0)) {
        tStats[topTeam.id].pts += scoring.group.topOfGroup;
      }
    });
  }

  const mStats = members.map(m => ({ ...m, pts: 0, gd: 0, gf: 0, teams: [], activeTeamsCount: 0, totalRank: 0 }));
  
  Object.keys(tStats).forEach(teamId => {
    const ownerId = assignments[teamId];
    if (ownerId) {
      const member = mStats.find(m => m.id === ownerId);
      if (member) {
        member.teams.push(tStats[teamId]);
        member.pts += tStats[teamId].pts;
        member.gd += tStats[teamId].totalGd; // Pulls total tournament GD!
        member.gf += tStats[teamId].totalGf; // Pulls total tournament GF!
        
        if (tStats[teamId].isActive) {
          member.totalRank += (tStats[teamId].rank || 0);
          member.activeTeamsCount += 1;
        }
      }
    }
  });

  mStats.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd - a.gd);

  const overallAwards = {};
  const kidsAwards = {};
  
  if (mStats.length > 0) {
    overallAwards['1st'] = mStats[0];
    if (mStats.length > 1) overallAwards['2nd'] = mStats[1];
    
    let wcWinnerOwner = null;
    if (wcWinnerId) {
      const ownerId = assignments[wcWinnerId];
      wcWinnerOwner = mStats.find(m => m.id === ownerId);
    }

    if (mStats.length > 2) {
      if (wcWinnerOwner && wcWinnerOwner.id !== mStats[0].id && wcWinnerOwner.id !== mStats[1].id) {
        overallAwards['3rd'] = wcWinnerOwner;
      } else {
        overallAwards['3rd'] = mStats[2];
      }
    }
    
    overallAwards['Spoon'] = mStats[mStats.length - 1];

    const kidStats = mStats.filter(m => m.isKid);
    kidsAwards.list = kidStats;
  }

  return { teamStats: tStats, memberStats: mStats, awards: { overall: overallAwards, kids: kidsAwards } };
};

export const getThirdPlaceStandings = (teamStats, matches, settings) => {
    const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    let thirds = [];

    groupsList.forEach(g => {
        const gTeams = Object.values(teamStats).filter(t => t.group === g);
        const sortedGTeams = sortGroupTeams(gTeams, matches, settings);
        if(sortedGTeams[2]) thirds.push(sortedGTeams[2]);
    });

    // Strictly uses group stage metrics
    thirds.sort((a,b) => b.groupPts !== a.groupPts ? b.groupPts - a.groupPts : (b.groupGd !== a.groupGd ? b.groupGd - a.groupGd : b.groupGf - a.groupGf));
    return thirds;
};

export const getR32Mappings = (teamStats, matches, settings) => {
    const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    let firsts = {};
    let seconds = {};
    
    groupsList.forEach(g => {
        const gTeams = Object.values(teamStats).filter(t => t.group === g);
        const sorted = sortGroupTeams(gTeams, matches, settings);

        if(sorted[0]) firsts[g] = sorted[0].id;
        if(sorted[1]) seconds[g] = sorted[1].id;
    });

    const thirdsList = getThirdPlaceStandings(teamStats, matches, settings);
    const advancingThirdsTeams = thirdsList.slice(0, 8);
    
    const advancingGroupsStr = advancingThirdsTeams.map(t => t.group).sort().join('').toUpperCase();
    const assignedThirds = THIRD_PLACE_MAP[advancingGroupsStr];
    const thirdTeamMap = {};
    advancingThirdsTeams.forEach(t => thirdTeamMap[t.group] = t.id);

    const r32Mapping = [
      { id: 'ko_R32_1', tA: seconds['A'], tB: seconds['B'] },
      { id: 'ko_R32_2', tA: firsts['E'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stE']] : 'THIRD' },
      { id: 'ko_R32_3', tA: firsts['F'], tB: seconds['C'] },
      { id: 'ko_R32_4', tA: firsts['C'], tB: seconds['F'] },
      { id: 'ko_R32_5', tA: firsts['I'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stI']] : 'THIRD' },
      { id: 'ko_R32_6', tA: seconds['E'], tB: seconds['I'] },
      { id: 'ko_R32_7', tA: firsts['A'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stA']] : 'THIRD' },
      { id: 'ko_R32_8', tA: firsts['L'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stL']] : 'THIRD' },
      { id: 'ko_R32_9', tA: firsts['D'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stD']] : 'THIRD' },
      { id: 'ko_R32_10', tA: firsts['G'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stG']] : 'THIRD' },
      { id: 'ko_R32_11', tA: seconds['K'], tB: seconds['L'] },
      { id: 'ko_R32_12', tA: firsts['H'], tB: seconds['J'] },
      { id: 'ko_R32_13', tA: firsts['B'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stB']] : 'THIRD' },
      { id: 'ko_R32_14', tA: firsts['J'], tB: seconds['H'] },
      { id: 'ko_R32_15', tA: firsts['K'], tB: assignedThirds ? thirdTeamMap[assignedThirds['1stK']] : 'THIRD' },
      { id: 'ko_R32_16', tA: seconds['D'], tB: seconds['G'] }
    ];

    if (!assignedThirds) {
        console.warn(`Missing CSV mapping for combo: ${advancingGroupsStr}. Using fallback algorithm!`);
        let availableThirds = [...advancingThirdsTeams];
        r32Mapping.forEach(match => {
            if (match.tB === 'THIRD') {
                const groupA = TEAMS_DATA.find(t => t.id === match.tA)?.group;
                const validThirdIdx = availableThirds.findIndex(t => t.group !== groupA);
                
                if (validThirdIdx !== -1) {
                    match.tB = availableThirds.splice(validThirdIdx, 1)[0].id;
                } else if (availableThirds.length > 0) {
                    match.tB = availableThirds.shift().id; 
                } else {
                    match.tB = '';
                }
            }
        });
    }

    return r32Mapping;
};