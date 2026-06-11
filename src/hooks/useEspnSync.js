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
 */

// A single ESPN competitor matches one of our teams if EITHER:
//   1. ESPN's 3-letter abbreviation equals our internal team id  (preferred — robust)
//   2. ESPN's full team name equals our espnName override, or our name (fallback)
//
// The abbreviation path retires most of the espnName overrides. The name path
// stays as a safety net for any team whose ESPN abbreviation doesn't line up
// with our FIFA-style id — so we never silently miss a score even if ESPN
// abbreviates a country differently than we do.
const competitorMatchesTeam = (competitor, teamData) => {
  const team = competitor?.team;
  if (!team || !teamData) return false;
  if (team.abbreviation && team.abbreviation === teamData.id) return true;
  const espnName = teamData.espnName || teamData.name;
  return team.name === espnName;
};

// True if an ESPN competitor maps to ANY team we know about. Used purely to
// surface drift in the console — if this ever returns false for a real team,
// that team needs an espnName override (or its id corrected).
const competitorMatchesAnyConfig = (competitor) =>
  TEAMS_DATA.some(t => competitorMatchesTeam(competitor, t));

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
        // Independent of match state (and of the setMatches updater timing), so
        // it always runs and never produces false positives from stale state.
        // Knockout fixtures can carry TBD placeholders before teams are decided;
        // those are filtered out so they don't masquerade as drift.
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

        // ── Score sync ──────────────────────────────────────────────────────
        setMatches(prevMatches => {
          let hasChanges = false;
          const nextMatches = prevMatches.map(m => {
            // Skip matches that are already marked as played
            if (m.isPlayed) return m;

            const teamDataA = TEAMS_DATA.find(t => t.id === m.teamA);
            const teamDataB = TEAMS_DATA.find(t => t.id === m.teamB);
            if (!teamDataA || !teamDataB) return m;

            const event = espnEvents.find(e => {
              const competitors = e.competitions?.[0]?.competitors || [];
              const hasA = competitors.some(c => competitorMatchesTeam(c, teamDataA));
              const hasB = competitors.some(c => competitorMatchesTeam(c, teamDataB));
              return hasA && hasB;
            });

            if (event) {
              const competitors = event.competitions[0].competitors;
              const compA = competitors.find(c => competitorMatchesTeam(c, teamDataA));
              const compB = competitors.find(c => competitorMatchesTeam(c, teamDataB));
              if (!compA || !compB) return m;

              const isFinished = event.status.type.completed;

              // Parse scores as numbers to avoid string vs number comparison issues
              const newScoreA = parseInt(compA.score) || 0;
              const newScoreB = parseInt(compB.score) || 0;
              const currentScoreA = parseInt(m.scoreA) || 0;
              const currentScoreB = parseInt(m.scoreB) || 0;

              if (
                currentScoreA !== newScoreA ||
                currentScoreB !== newScoreB ||
                m.isPlayed !== isFinished
              ) {
                hasChanges = true;
                return { ...m, scoreA: newScoreA, scoreB: newScoreB, isPlayed: isFinished };
              }
            }
            return m;
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
