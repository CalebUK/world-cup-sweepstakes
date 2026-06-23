import { TEAMS_DATA } from '../config/data.js';
import { sortGroupTeams, getThirdPlaceStandings, getR32Mappings } from '../utils/tournamentLogic.js';
import { useEffect, useRef } from 'react';

export const useTournamentEngine = ({
  matches, setMatches, teamStats, eliminatedTeams, setEliminatedTeams,
  manualRestores, manualEliminations, settings, isOwner, isSuperAdmin, saveState, leagueDataReady,
}) => {
  // Signature of the matches array we last wrote, so an echo or a pre-echo
  // re-run can't trigger an identical write.
  const lastWrittenMatchesRef = useRef(null);

  useEffect(() => {
    if (!leagueDataReady) return;
    if (matches.length === 0 || Object.keys(teamStats).length === 0) return;

    let hasMatchesChanges = false;
    const nextMatches = [...matches];
    const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    // ─── Step 1: Build the correct elimination set from scratch ──────────────
    // We never mutate the existing eliminatedTeams — we recompute who SHOULD
    // be eliminated based purely on current match state, then apply
    // manualRestores overrides at the end.
    const recomputedEliminations = {};

    let groupMatchesPlayed = 0;

    // ── Group stage: 4th place in every complete group ──────────────────────
    groupsList.forEach(g => {
      const gMatches = nextMatches.filter(
        m => m.stage === 'Group' && TEAMS_DATA.find(t => t.id === m.teamA)?.group === g
      );
      const playedInGroup = gMatches.filter(m => m.isPlayed).length;
      groupMatchesPlayed += playedInGroup;

      if (gMatches.length === 6 && playedInGroup === 6) {
        const gTeams = Object.values(teamStats).filter(t => t.group === g);
        const sortedGTeams = sortGroupTeams(gTeams, nextMatches, settings);
        if (sortedGTeams.length === 4) {
          recomputedEliminations[sortedGTeams[3].id] = true;
        }
      }
    });

    // ── Group stage: bottom 4 third-placers once all 72 games are played ────
    if (groupMatchesPlayed === 72) {
      const thirdsList = getThirdPlaceStandings(teamStats, nextMatches, settings);
      thirdsList.slice(8).forEach(t => {
        recomputedEliminations[t.id] = true;
      });
    }

   // ─── Step 2: Propagate winners into the next knockout matches ─────────────
    // Only run once we have a full set of team stats. A partial/transient
    // teamStats pass makes getR32Mappings return undefined IDs, which would
    // wipe already-populated slots and cause the bracket to flicker.
    if (groupMatchesPlayed >= 24) {
      const r32Mappings = getR32Mappings(teamStats, nextMatches, settings);
      console.log('engine groupMatchesPlayed:', groupMatchesPlayed);
      console.log('R32 mappings:', r32Mappings.map(m => `${m.id}: ${m.tA || 'EMPTY'}/${m.tB || 'EMPTY'}`));
      r32Mappings.forEach(mapping => {
        const matchIndex = nextMatches.findIndex(m => m.id === mapping.id);
        if (matchIndex !== -1) {
          const cur = nextMatches[matchIndex];
          // Fall back to the existing team if the mapping resolves empty, so a
          // transient computation never clears a real team from a slot.
          const tA = mapping.tA || cur.teamA || '';
          const tB = mapping.tB || cur.teamB || '';
          if (cur.teamA !== tA || cur.teamB !== tB) {
            nextMatches[matchIndex] = { ...cur, teamA: tA, teamB: tB };
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
              } else if (m.penWinner) {
                winnerId = m.penWinner;
              }
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

    // ── Knockout stage: loser of every played match ──────────────────────────
    // Only runs if the match is currently marked FT (isPlayed).
    // If FT is un-ticked, the team is simply absent from recomputedEliminations
    // (unless they were also eliminated by a different match), so they come back.
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
            } else if (m.penWinner) {
              loserId = m.penWinner === m.teamA ? m.teamB : m.teamA;
            }
          }
        }
        if (loserId) {
          recomputedEliminations[loserId] = true;
        }
      }
    });

    // ─── Step 3a: Apply manualEliminations overrides ──────────────────────────
    // Teams the commish force-eliminated (mathematically out before their group
    // finishes, or a shootout loser the ESPN sync can't resolve). Added on top
    // of the match-derived set so they survive every recompute.
    Object.keys(manualEliminations).forEach(teamId => {
      if (manualEliminations[teamId]) {
        recomputedEliminations[teamId] = true;
      }
    });

    // ─── Step 3b: Apply manualRestores overrides ───────────────────────────────
    Object.keys(manualRestores).forEach(teamId => {
      if (manualRestores[teamId]) {
        delete recomputedEliminations[teamId];
      }
    });

    // ─── Step 4: Save only if the elimination state actually changed ──────────
    const currentStr = JSON.stringify(
      Object.keys(eliminatedTeams).sort().reduce((acc, k) => {
        if (eliminatedTeams[k]) acc[k] = true;
        return acc;
      }, {})
    );
    const nextStr = JSON.stringify(
      Object.keys(recomputedEliminations).sort().reduce((acc, k) => {
        if (recomputedEliminations[k]) acc[k] = true;
        return acc;
      }, {})
    );

    if (currentStr !== nextStr && isOwner) {
      setEliminatedTeams(recomputedEliminations);
      saveState('eliminatedTeams', recomputedEliminations);
    }

    console.log('write attempt:', { autoSync: settings.autoSync, isSuperAdmin, hasMatchesChanges });
    if (hasMatchesChanges && isSuperAdmin) {
      const matchesSig = JSON.stringify(nextMatches);
      if (lastWrittenMatchesRef.current !== matchesSig) {
        lastWrittenMatchesRef.current = matchesSig;
        setMatches(nextMatches);
        saveState('matches', nextMatches);
      }
    }
  }, [matches, teamStats, eliminatedTeams, isOwner, isSuperAdmin, settings, manualRestores, manualEliminations, leagueDataReady]);
};
