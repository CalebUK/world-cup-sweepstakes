// src/fantasy/fantasyLogic.js
//
// Pure logic for the Fantasy / Roto mode. No React, no Firestore, no side effects.
// Everything in this file is unit-testable in isolation.
//
// Two responsibilities:
//   1. runFantasyDraft(members, teamsPerManager) — randomly assigns teams to
//      managers using FIFA-rank groups, never assigning the same team twice
//      to the same manager within the same pass through a group.
//   2. calculateRotoStandings(members, picks, matchStats) — given each
//      manager's (team, stat) picks plus per-match stats, returns the Roto
//      standings (rank within each category, summed for total Roto points).
//
// The 4 stats tracked:
//   - goals          (higher is better)
//   - shotsOnTarget  (higher is better)
//   - cards          (lower is better)  — sum of (yellows × 1) + (reds × 3)
//   - goalsAllowed   (lower is better)  — total goals conceded by the team

import { TEAMS_DATA } from '../config/data.js';

// ─────────────────────────────────────────────────────────────────────────────
// Stat definitions — change here if we ever add or rename categories
// ─────────────────────────────────────────────────────────────────────────────

export const FANTASY_STATS = [
  { id: 'goals',         label: 'Goals',           higherIsBetter: true  },
  { id: 'shotsOnTarget', label: 'Shots on Target', higherIsBetter: true  },
  { id: 'cards',         label: 'Cards',           higherIsBetter: false },
  { id: 'goalsAllowed',  label: 'Goals Allowed',   higherIsBetter: false },
];

// Card scoring weights — exposed so the UI / tests use the same numbers
export const CARD_WEIGHTS = { yellow: 1, red: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// Internal: build the FIFA-rank groups
//
// Step 1: sort all 48 teams by FIFA rank (ascending — rank 1 is the best).
// Step 2: split them into N buckets of size = members.length, where N is the
//         largest number of complete buckets we can fit (i.e. floor(48 / N)).
//         Any leftover teams (when 48 doesn't divide evenly) get folded into
//         the LAST bucket — so nothing is ever excluded from the draft.
//
// Example with 8 members: 48 / 8 = 6 buckets of 8.
// Example with 7 members: floor(48 / 7) = 6 buckets — first 5 hold 7 each,
//                         last bucket absorbs the leftover 6 → 13 teams.
// Example with 6 members: 48 / 6 = 8 buckets of 6.
// ─────────────────────────────────────────────────────────────────────────────

const buildRankedGroups = (memberCount) => {
  if (memberCount <= 0) return [];

  const groupCount = Math.floor(TEAMS_DATA.length / memberCount);
  if (groupCount === 0) return []; // more managers than teams — impossible draft

  const sorted = [...TEAMS_DATA].sort((a, b) => a.rank - b.rank);

  const groups = [];
  for (let g = 0; g < groupCount; g++) {
    const start = g * memberCount;
    // Last bucket scoops up everything from `start` to the end of the list,
    // so any leftover lowest-ranked teams are still in play.
    const end = (g === groupCount - 1) ? sorted.length : start + memberCount;
    groups.push(sorted.slice(start, end));
  }
  return groups;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: shuffle helper — Fisher–Yates, returns a new array
// ─────────────────────────────────────────────────────────────────────────────

const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: assign one pass of a group to managers
//
// Given a group of teams and the list of managers, return a mapping from
// managerId → teamId such that no manager gets a team they already own.
//
// We try a constraint-aware random matching:
//   - Shuffle the managers, then for each manager pick a random team from the
//     ones they don't already own.
//   - If we paint ourselves into a corner (the last manager has no valid
//     team left), throw and retry. With these numbers retries are vanishingly
//     rare, but we cap retries to be safe.
// ─────────────────────────────────────────────────────────────────────────────

const assignGroupPass = (groupTeams, managers, currentOwnership) => {
  const MAX_RETRIES = 50;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const shuffledManagers = shuffle(managers);
    const remainingTeams = [...groupTeams];
    const assignment = {}; // managerId → teamId
    let failed = false;

    for (const manager of shuffledManagers) {
      const owned = new Set(currentOwnership[manager.id] || []);
      const candidates = remainingTeams.filter(t => !owned.has(t.id));

      if (candidates.length === 0) { failed = true; break; }

      // pick a random valid candidate
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      assignment[manager.id] = choice.id;
      const idx = remainingTeams.findIndex(t => t.id === choice.id);
      remainingTeams.splice(idx, 1);
    }

    if (!failed) return assignment;
  }

  // Should be effectively unreachable for the realistic member counts (1–48)
  throw new Error('Fantasy draft: could not satisfy no-duplicate constraint after 50 retries');
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: runFantasyDraft
//
// Inputs:
//   members          — array of { id, name, ... }
//   teamsPerManager  — integer ≥ 1 (default 10)
//
// Output:
//   {
//     ownership: { [managerId]: [teamId, teamId, ...] },
//     groupCount,        // how many ranked groups exist
//     fullPasses,        // how many complete passes through all groups happened
//     partialPassSize,   // how many groups in the final partial pass (0 if exact)
//   }
//
// Algorithm:
//   For each pass through the groups (group 0 first, group 1, ... group N-1),
//   assign every manager exactly one team from that group, with no manager
//   getting a team they already own. Continue until every manager has
//   `teamsPerManager` teams. The same team CAN end up with multiple owners
//   across passes — that's expected.
// ─────────────────────────────────────────────────────────────────────────────

export const runFantasyDraft = (members, teamsPerManager = 10) => {
  if (!members || members.length === 0) {
    return { ownership: {}, groupCount: 0, fullPasses: 0, partialPassSize: 0 };
  }

  const groups = buildRankedGroups(members.length);
  if (groups.length === 0) {
    throw new Error(`Fantasy draft: not enough teams (${TEAMS_DATA.length}) for ${members.length} managers`);
  }

  const ownership = {};
  members.forEach(m => { ownership[m.id] = []; });

  // Total passes needed = teamsPerManager (each pass adds 1 team per manager,
  // capped at groups.length passes per cycle)
  let assigned = 0;
  let groupIdx = 0;

  while (assigned < teamsPerManager) {
    const group = groups[groupIdx % groups.length];
    const passResult = assignGroupPass(group, members, ownership);

    Object.entries(passResult).forEach(([managerId, teamId]) => {
      ownership[managerId].push(teamId);
    });

    assigned++;
    groupIdx++;
  }

  const fullPasses = Math.floor(teamsPerManager / groups.length);
  const partialPassSize = teamsPerManager % groups.length;

  return { ownership, groupCount: groups.length, fullPasses, partialPassSize };
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: aggregateTeamStats
//
// Rolls the per-match stats up to per-team totals across the whole tournament.
// Each match has stats for both teams — we attribute them to the right team.
//
// matchStats shape (stored in Firestore):
//   {
//     [matchId]: {
//       teamA: { goals, shotsOnTarget, yellows, reds },
//       teamB: { goals, shotsOnTarget, yellows, reds },
//     }
//   }
//
// Output: { [teamId]: { goals, shotsOnTarget, cards, goalsAllowed } }
// ─────────────────────────────────────────────────────────────────────────────

const cardPenalty = (stats) =>
  (parseInt(stats?.yellows) || 0) * CARD_WEIGHTS.yellow +
  (parseInt(stats?.reds)    || 0) * CARD_WEIGHTS.red;

export const aggregateTeamStats = (matches, matchStats) => {
  const totals = {};
  TEAMS_DATA.forEach(t => {
    totals[t.id] = { goals: 0, shotsOnTarget: 0, cards: 0, goalsAllowed: 0 };
  });

  matches.forEach(m => {
    if (!m.isPlayed) return;
    const ms = matchStats?.[m.id];
    if (!ms) return;

    const a = ms.teamA || {};
    const b = ms.teamB || {};

    if (totals[m.teamA]) {
      totals[m.teamA].goals          += parseInt(a.goals)         || 0;
      totals[m.teamA].shotsOnTarget  += parseInt(a.shotsOnTarget) || 0;
      totals[m.teamA].cards          += cardPenalty(a);
      totals[m.teamA].goalsAllowed   += parseInt(b.goals)         || 0;
    }
    if (totals[m.teamB]) {
      totals[m.teamB].goals          += parseInt(b.goals)         || 0;
      totals[m.teamB].shotsOnTarget  += parseInt(b.shotsOnTarget) || 0;
      totals[m.teamB].cards          += cardPenalty(b);
      totals[m.teamB].goalsAllowed   += parseInt(a.goals)         || 0;
    }
  });

  return totals;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: calculateRotoStandings
//
// Inputs:
//   members     — [{ id, name }]
//   picks       — { [managerId]: { goals: [teamId,...], shotsOnTarget: [...], cards: [...], goalsAllowed: [...] } }
//   teamTotals  — output of aggregateTeamStats
//
// Roto rules:
//   For each stat category, sum each manager's picked teams' values for that
//   stat. Then rank managers within the category: best gets N points (where
//   N = member count), next gets N-1, ..., worst gets 1. Ties share the
//   average of the points they would have collectively earned.
//   Total Roto points = sum across all 4 categories.
//   Ties on total Roto points stay tied (no tiebreaker).
//
// Output:
//   [
//     {
//       id, name,                              // manager identity
//       categoryTotals: { goals, sot, cards, ga },     // raw summed stats
//       categoryPoints: { goals, sot, cards, ga },     // roto points per cat
//       rotoTotal,                                     // sum of category points
//       rank,                                          // overall position (1 = leader)
//     },
//     ...
//   ]
//   sorted by rotoTotal descending.
// ─────────────────────────────────────────────────────────────────────────────

// Average-rank scoring: ties share the average points their tied positions
// would collectively earn. Best stat-value gets N points, worst gets 1.
const rankWithinCategory = (memberValues, higherIsBetter) => {
  // memberValues: [{ id, value }, ...]
  const sorted = [...memberValues].sort((a, b) =>
    higherIsBetter ? b.value - a.value : a.value - b.value
  );
  const N = sorted.length;
  const points = {}; // managerId → points

  let i = 0;
  while (i < N) {
    // find the run of tied values
    let j = i;
    while (j + 1 < N && sorted[j + 1].value === sorted[i].value) j++;
    // positions i..j are tied; they would have earned (N-i) + (N-i-1) + ... + (N-j) points
    let pool = 0;
    for (let k = i; k <= j; k++) pool += (N - k);
    const share = pool / (j - i + 1);
    for (let k = i; k <= j; k++) points[sorted[k].id] = share;
    i = j + 1;
  }
  return points;
};

export const calculateRotoStandings = (members, picks, teamTotals) => {
  if (!members || members.length === 0) return [];

  const safePicks = picks || {};

  // 1. compute each manager's summed stat in each category
  const summed = members.map(m => {
    const mp = safePicks[m.id] || {};
    const sumStat = (statId) => {
      const teamIds = mp[statId] || [];
      return teamIds.reduce((acc, tid) => acc + (teamTotals[tid]?.[statId] || 0), 0);
    };
    return {
      id: m.id,
      name: m.name,
      categoryTotals: {
        goals:         sumStat('goals'),
        shotsOnTarget: sumStat('shotsOnTarget'),
        cards:         sumStat('cards'),
        goalsAllowed:  sumStat('goalsAllowed'),
      },
    };
  });

  // 2. rank within each category
  const categoryPointsByManager = {};
  members.forEach(m => { categoryPointsByManager[m.id] = {}; });

  FANTASY_STATS.forEach(stat => {
    const values = summed.map(s => ({ id: s.id, value: s.categoryTotals[stat.id] }));
    const points = rankWithinCategory(values, stat.higherIsBetter);
    members.forEach(m => {
      categoryPointsByManager[m.id][stat.id] = points[m.id] || 0;
    });
  });

  // 3. assemble final standings
  const standings = summed.map(s => {
    const cp = categoryPointsByManager[s.id];
    const rotoTotal =
      cp.goals + cp.shotsOnTarget + cp.cards + cp.goalsAllowed;
    return {
      ...s,
      categoryPoints: cp,
      rotoTotal,
    };
  });

  // 4. sort and rank (ties stay tied — they share the same rank)
  standings.sort((a, b) => b.rotoTotal - a.rotoTotal);
  let lastTotal = null;
  let lastRank = 0;
  standings.forEach((s, idx) => {
    if (s.rotoTotal === lastTotal) {
      s.rank = lastRank;
    } else {
      s.rank = idx + 1;
      lastRank = s.rank;
      lastTotal = s.rotoTotal;
    }
  });

  return standings;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: validatePicks
//
// Sanity-check the (team, stat) pick map. Used by the FantasyTeamsTab to show
// a "complete / incomplete" indicator. Each manager should have exactly
// expectedPerCategory picks in each of the 4 categories, and no two managers
// should share the same (team, stat) combination.
//
// Returns:
//   {
//     ok: boolean,
//     issues: [string],       // human-readable problems
//     countsByManager: { [managerId]: { goals, shotsOnTarget, cards, goalsAllowed } },
//   }
// ─────────────────────────────────────────────────────────────────────────────

export const validatePicks = (members, picks, expectedPerCategory = 5) => {
  const issues = [];
  const countsByManager = {};
  const safePicks = picks || {};

  members.forEach(m => {
    const mp = safePicks[m.id] || {};
    countsByManager[m.id] = {
      goals:         (mp.goals         || []).length,
      shotsOnTarget: (mp.shotsOnTarget || []).length,
      cards:         (mp.cards         || []).length,
      goalsAllowed:  (mp.goalsAllowed  || []).length,
    };

    FANTASY_STATS.forEach(stat => {
      const c = countsByManager[m.id][stat.id];
      if (c !== expectedPerCategory) {
        issues.push(`${m.name} has ${c} pick${c === 1 ? '' : 's'} for ${stat.label} (expected ${expectedPerCategory})`);
      }
    });
  });

  // Exclusivity: each (team, stat) combo can belong to only one manager
  FANTASY_STATS.forEach(stat => {
    const claimed = {}; // teamId → managerName
    members.forEach(m => {
      const teamIds = (safePicks[m.id]?.[stat.id]) || [];
      teamIds.forEach(tid => {
        if (claimed[tid]) {
          issues.push(`${stat.label}: ${tid} is claimed by both ${claimed[tid]} and ${m.name}`);
        } else {
          claimed[tid] = m.name;
        }
      });
    });
  });

  return { ok: issues.length === 0, issues, countsByManager };
};
