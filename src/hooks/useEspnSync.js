import { useEffect, useRef } from 'react';
import { TEAMS_DATA } from '../config/data.js';

/**
 * Polls ESPN every 5 minutes for live scores, but ONLY when:
 *   - The current user is the super admin
 *   - autoSync is enabled in the league settings
 *
 * Writes results to the global matches table via saveState('matches', ...).
 * All other users/leagues read from that table when autoSync is on,
 * or from their own per-league matches when autoSync is off.
 *
 * Knockout shootouts: a completed knockout game whose score is level after
 * 90/120' went to penalties. We set isAET + penWinner (+ penScoreA/penScoreB
 * when ESPN provides them) so the engine awards penWin/penLoss, advances the
 * bracket, and eliminates the shootout loser — matching the manual flow.
 */

// A single ESPN competitor matches one of our teams if EITHER:
//   1. ESPN's 3-letter abbreviation equals our internal team id  (preferred — robust)
//   2. ESPN's full team name equals our espnName override, or our name (fallback)
const competitorMatchesTeam = (competitor, teamData) => {
  const team = competitor?.team;
  if (!team || !teamData) return false;
  if (team.abbreviation && team.abbreviation === teamData.id) return true;
  const espnName = teamData.espnName || teamData.name;
  return team.name === espnName;
};

// True if an ESPN competitor maps to ANY team we know about (drift watch only).
const competitorMatchesAnyConfig = (competitor) =>
  TEAMS_DATA.some(t => competitorMatchesTeam(competitor, t));

// Work out the shootout winner for a level, completed knockout tie.
//   - shootoutScore: ESPN's pen tally. NOTE: this field name is the one piece
//     not yet verified against a live penalty game — if it turns out to be
//     named differently, only the pen-score badge is affected, because the
//     winner is still resolved from the verified `winner` boolean below.
//   - winner: boolean flag ESPN sets true on the advancing side once complete
//     (confirmed present in the live feed). This is the reliable signal.
// Returns winnerSide 'A' | 'B' | null, plus pen tallies only when ESPN gave them.
const resolveShootout = (compA, compB) => {
  const psA = parseInt(compA?.shootoutScore);
  const psB = parseInt(compB?.shootoutScore);
  const haveScores = !isNaN(psA) && !isNaN(psB) && psA !== psB;

  let winnerSide = null;
  if (haveScores) winnerSide = psA > psB ? 'A' : 'B';
  else if (compA?.winner === true) winnerSide = 'A';
  else if (compB?.winner === true) winnerSide = 'B';

  return {
    winnerSide,
    penScoreA: haveScores ? psA : null,
    penScoreB: haveScores ? psB : null,
  };
};

export const useEspnSync = (isSuperAdmin, settings, setMatches, saveState) => {
  const saveStateRef = useRef(saveState);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    if (!isSuperAdmin || !settings.autoSync) return;
    let isMounted = true;

    const fetchESPN = async () => {
      try {
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
        if (!response.ok) return;

        const data = await response.json();
        const espnEvents = data.events || [];
        if (espnEvents.length === 0) return;

        // ── Drift watch ─────────────────────────────────────────────────────
        // Independent of match state, so it always runs and never produces
        // false positives from stale state. TBD knockout placeholders skipped.
        const drifted = [];
        espnEvents.forEach(e => {
          (e.competitions?.[0]?.competitors || []).forEach(c => {
            const abbr = c.team?.abbreviation;
            if (!abbr || abbr === 'TBD') return;
            if (!competitorMatchesAnyConfig(c)) {
              drifted.push({ abbr, name: c.team?.name, event: e.name });
            }
          });
        });
        if (drifted.length > 0) {
          console.warn(
            '[useEspnSync] ESPN team(s) not matching any TEAMS_DATA entry — ' +
            'add an espnName override or fix the id:',
            drifted
          );
        }

        // ── Score + shootout sync ───────────────────────────────────────────
        setMatches(prevMatches => {
          let hasChanges = false;
          const nextMatches = prevMatches.map(m => {
            // Skip finalized matches — EXCEPT a knockout tie we've flagged as
            // AET but haven't resolved a winner for yet. Those keep getting
            // re-checked until ESPN sets the winner (handles completed-before-
            // winner-flag races). A manually entered penWinner closes it out.
            const needsShootoutResolution =
              m.isPlayed && m.stage !== 'Group' && m.isAET && !m.penWinner;
            if (m.isPlayed && !needsShootoutResolution) return m;

            const teamDataA = TEAMS_DATA.find(t => t.id === m.teamA);
            const teamDataB = TEAMS_DATA.find(t => t.id === m.teamB);
            if (!teamDataA || !teamDataB) return m;

            const event = espnEvents.find(e => {
              const cs = e.competitions?.[0]?.competitors || [];
              return cs.some(c => competitorMatchesTeam(c, teamDataA)) &&
                     cs.some(c => competitorMatchesTeam(c, teamDataB));
            });
            if (!event) return m;

            const competitors = event.competitions[0].competitors;
            const compA = competitors.find(c => competitorMatchesTeam(c, teamDataA));
            const compB = competitors.find(c => competitorMatchesTeam(c, teamDataB));
            if (!compA || !compB) return m;

            const isFinished = event.status?.type?.completed === true;
            const newScoreA = parseInt(compA.score) || 0;
            const newScoreB = parseInt(compB.score) || 0;

            // Build a patch so we can also detect changes to the pen fields,
            // not just scoreA/scoreB/isPlayed.
            const patch = {};
            if ((parseInt(m.scoreA) || 0) !== newScoreA) patch.scoreA = newScoreA;
            if ((parseInt(m.scoreB) || 0) !== newScoreB) patch.scoreB = newScoreB;
            if (m.isPlayed !== isFinished) patch.isPlayed = isFinished;

            // Penalties: completed knockout game, level after 90/120'.
            if (isFinished && m.stage !== 'Group' && newScoreA === newScoreB) {
              if (!m.isAET) patch.isAET = true;

              const { winnerSide, penScoreA, penScoreB } = resolveShootout(compA, compB);
              if (winnerSide) {
                const penWinner = winnerSide === 'A' ? m.teamA : m.teamB;
                if (m.penWinner !== penWinner) patch.penWinner = penWinner;
                if (penScoreA !== null && parseInt(m.penScoreA) !== penScoreA) patch.penScoreA = penScoreA;
                if (penScoreB !== null && parseInt(m.penScoreB) !== penScoreB) patch.penScoreB = penScoreB;
              } else {
                console.warn(
                  `[useEspnSync] ${event.name} finished level ` +
                  `(${newScoreA}-${newScoreB}) but ESPN gave no shootout winner yet — ` +
                  `commish can enter it manually, or it'll resolve on a later poll.`
                );
              }
            }

            if (Object.keys(patch).length === 0) return m;
            hasChanges = true;
            return { ...m, ...patch };
          });

          if (hasChanges && isMounted) {
            saveStateRef.current('matches', nextMatches);
            return nextMatches;
          }
          return prevMatches;
        });
      } catch (err) {
        console.warn('ESPN sync skipped (network or API issue):', err);
      }
    };

    fetchESPN();
    const intervalId = setInterval(fetchESPN, 300_000); // every 5 minutes

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isSuperAdmin, settings.autoSync, setMatches]);
};
