// src/fantasy/useFantasyData.js
//
// Subscribes to the league's fantasy document at:
//   artifacts/{appId}/public/data/fantasy/{leagueId}
//
// Only active when settings.fantasyMode is true. When fantasy mode is off
// the hook returns empty state and never opens a Firestore listener — zero
// cost when the feature isn't being used.
//
// Mirrors the pattern in useLeagueData.js:
//   - separate per-league document, isolated from sweepstakes data
//   - writingRef debounce so a local write doesn't race the snapshot
//   - only the commish (isOwner) can write
//
// Document shape:
//   {
//     ownership:  { [managerId]: [teamId, ...] },     // from runFantasyDraft
//     picks:      { [managerId]: { goals: [], shotsOnTarget: [], cards: [], goalsAllowed: [] } },
//     matchStats: { [matchId]:   { teamA: {goals, shotsOnTarget, yellows, reds},
//                                  teamB: {goals, shotsOnTarget, yellows, reds} } },
//     draftMeta:  { teamsPerManager, draftedAt, groupCount }
//   }

import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../config/firebase.js';

const EMPTY_STATE = {
  ownership: {},
  picks: {},
  matchStats: {},
  draftMeta: null,
};

export const useFantasyData = ({ user, activeLeagueId, isOwner, fantasyMode }) => {
  const [ownership, setOwnership]   = useState({});
  const [picks, setPicks]           = useState({});
  const [matchStats, setMatchStats] = useState({});
  const [draftMeta, setDraftMeta]   = useState(null);
  const [fantasyDataReady, setFantasyDataReady] = useState(false);

  const writingRef = useRef(false);

  // ─── Subscription ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Reset whenever league or mode changes
    setOwnership({});
    setPicks({});
    setMatchStats({});
    setDraftMeta(null);
    setFantasyDataReady(false);

    // No listener when fantasy mode is off — zero overhead for normal leagues
    if (!user || !activeLeagueId || !fantasyMode) {
      return;
    }

    const fantasyRef = doc(db, 'artifacts', appId, 'public', 'data', 'fantasy', activeLeagueId);

    const unsub = onSnapshot(fantasyRef, (snap) => {
      if (writingRef.current) return;

      if (snap.exists()) {
        const data = snap.data();
        setOwnership(data.ownership   || {});
        setPicks(data.picks           || {});
        setMatchStats(data.matchStats || {});
        setDraftMeta(data.draftMeta   || null);
      } else {
        // First time fantasy mode is enabled for this league — seed an empty doc
        // (commish only — viewers just see empty state until commish acts)
        if (isOwner) {
          setDoc(fantasyRef, EMPTY_STATE).catch(err =>
            console.error('Error seeding fantasy doc:', err)
          );
        }
        setOwnership({});
        setPicks({});
        setMatchStats({});
        setDraftMeta(null);
      }
      setFantasyDataReady(true);
    }, (err) => {
      console.error('Fantasy snapshot error:', err);
      setFantasyDataReady(true);
    });

    return () => unsub();
  }, [user, activeLeagueId, isOwner, fantasyMode]);

  // ─── Cloud writer ─────────────────────────────────────────────────────────
  //
  // Generic key/value writer mirroring saveState() in useLeagueData.js.
  // Accepts any of: 'ownership', 'picks', 'matchStats', 'draftMeta'
  // (or pass an object to merge multiple keys at once).
  //
  // Only the commish (isOwner) can write — viewers see read-only state.

  const saveFantasyState = async (keyOrPatch, value) => {
    if (!user || !activeLeagueId || !isOwner) return;
    try {
      const patch = (typeof keyOrPatch === 'object')
        ? keyOrPatch
        : { [keyOrPatch]: value };

      const serialised = JSON.stringify(patch);
      if (serialised.length > 500_000) {
        console.error(`saveFantasyState: payload too large (${serialised.length} bytes), refusing.`);
        return;
      }
      const safe = JSON.parse(serialised);

      writingRef.current = true;
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'fantasy', activeLeagueId);
      await setDoc(ref, safe, { merge: true });
      writingRef.current = false;
    } catch (err) {
      writingRef.current = false;
      console.error('Error saving fantasy state:', err);
    }
  };

  // ─── Convenience setters ─────────────────────────────────────────────────

  // commitDraft: write ownership + draftMeta together, also CLEARS picks +
  // matchStats since a fresh draft invalidates any previous assignments.
  const commitDraft = async (newOwnership, draftMetaUpdate) => {
    if (!isOwner) return;

    setOwnership(newOwnership);
    setPicks({});
    setMatchStats({});
    setDraftMeta(draftMetaUpdate);

    await saveFantasyState({
      ownership: newOwnership,
      picks: {},
      matchStats: {},
      draftMeta: draftMetaUpdate,
    });
  };

  // updatePick: set a single (manager, stat) → [teamIds] entry
  const updatePick = (managerId, statId, teamIds) => {
    if (!isOwner) return;
    const next = {
      ...picks,
      [managerId]: {
        ...(picks[managerId] || {}),
        [statId]: teamIds,
      },
    };
    setPicks(next);
    saveFantasyState('picks', next);
  };

  // updateMatchStat: set a single field on a single side of a single match
  // e.g. updateMatchStat('match_GroupA_1', 'teamA', 'shotsOnTarget', 6)
  const updateMatchStat = (matchId, side, field, value) => {
    if (!isOwner) return;
    const next = {
      ...matchStats,
      [matchId]: {
        ...(matchStats[matchId] || {}),
        [side]: {
          ...(matchStats[matchId]?.[side] || {}),
          [field]: value,
        },
      },
    };
    setMatchStats(next);
    saveFantasyState('matchStats', next);
  };

  return {
    ownership,
    picks,
    matchStats,
    draftMeta,
    fantasyDataReady,
    // writers
    saveFantasyState,
    commitDraft,
    updatePick,
    updateMatchStat,
  };
};
