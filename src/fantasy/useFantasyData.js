// src/fantasy/useFantasyData.js
//
// Subscribes to the league's fantasy document at:
//   artifacts/{appId}/public/data/fantasy/{leagueId}
//
// Only active when settings.fantasyMode is true. When fantasy mode is off
// the hook returns empty state and never opens a Firestore listener — zero
// cost when the feature isn't being used.

import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../config/firebase.js';

export const useFantasyData = ({ user, activeLeagueId, isOwner, fantasyMode }) => {
  const [ownership, setOwnership]   = useState({});
  const [picks, setPicks]           = useState({});
  const [matchStats, setMatchStats] = useState({});
  const [draftMeta, setDraftMeta]   = useState(null);
  const [fantasyDataReady, setFantasyDataReady] = useState(false);

  // Latest values, used by writers so they don't go stale between renders
  const picksRef      = useRef(picks);
  const matchStatsRef = useRef(matchStats);
  const isOwnerRef    = useRef(isOwner);
  useEffect(() => { picksRef.current      = picks;      }, [picks]);
  useEffect(() => { matchStatsRef.current = matchStats; }, [matchStats]);
  useEffect(() => { isOwnerRef.current    = isOwner;    }, [isOwner]);

  // ─── Subscription ─────────────────────────────────────────────────────────
  // NOTE: isOwner is intentionally NOT in the dep array. The listener should
  // stay attached even when permission resolves later — it only ever READS,
  // and writes go through the writers which check isOwnerRef at call time.

  useEffect(() => {
    // Reset whenever league or mode changes
    setOwnership({});
    setPicks({});
    setMatchStats({});
    setDraftMeta(null);
    setFantasyDataReady(false);

    if (!user || !activeLeagueId || !fantasyMode) {
      return;
    }

    const fantasyRef = doc(db, 'artifacts', appId, 'public', 'data', 'fantasy', activeLeagueId);

    const unsub = onSnapshot(
      fantasyRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOwnership(data.ownership   || {});
          setPicks(data.picks           || {});
          setMatchStats(data.matchStats || {});
          setDraftMeta(data.draftMeta   || null);
        } else {
          // Doc doesn't exist yet — leave local state empty. We do NOT seed
          // the doc here; it will be created on the first real write
          // (commitDraft, updatePick, etc.). Seeding caused phantom writes
          // and race conditions during league switches.
          setOwnership({});
          setPicks({});
          setMatchStats({});
          setDraftMeta(null);
        }
        setFantasyDataReady(true);
      },
      (err) => {
        console.error('Fantasy snapshot error:', err);
        setFantasyDataReady(true);
      }
    );

    return () => unsub();
  }, [user, activeLeagueId, fantasyMode]);

  // ─── Cloud writer ─────────────────────────────────────────────────────────
  // Generic key/value writer. Accepts either:
  //   saveFantasyState('picks', newPicks)
  //   saveFantasyState({ ownership, picks, matchStats, draftMeta })
  //
  // Always does the local optimistic update FIRST so the UI reflects the
  // change immediately, then persists. The snapshot will reconcile if the
  // write somehow disagrees.

  const saveFantasyState = async (keyOrPatch, value) => {
    if (!user || !activeLeagueId) return;
    if (!isOwnerRef.current) return;

    const patch = (typeof keyOrPatch === 'object' && keyOrPatch !== null)
      ? keyOrPatch
      : { [keyOrPatch]: value };

    // Optimistic local updates
    if ('ownership'  in patch) setOwnership(patch.ownership   || {});
    if ('picks'      in patch) setPicks(patch.picks           || {});
    if ('matchStats' in patch) setMatchStats(patch.matchStats || {});
    if ('draftMeta'  in patch) setDraftMeta(patch.draftMeta   || null);

    try {
      const serialised = JSON.stringify(patch);
      if (serialised.length > 500_000) {
        console.error(`saveFantasyState: payload too large (${serialised.length} bytes), refusing.`);
        return;
      }
      const safe = JSON.parse(serialised);
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'fantasy', activeLeagueId);
      await setDoc(ref, safe, { merge: true });
    } catch (err) {
      console.error('Error saving fantasy state:', err);
    }
  };

  // ─── Convenience setters ─────────────────────────────────────────────────

  // commitDraft: write ownership + draftMeta together, also CLEARS picks +
  // matchStats since a fresh draft invalidates any previous assignments.
  const commitDraft = async (newOwnership, draftMetaUpdate) => {
    if (!isOwnerRef.current) return;
    await saveFantasyState({
      ownership: newOwnership,
      picks: {},
      matchStats: {},
      draftMeta: draftMetaUpdate,
    });
  };

  // updatePick: set a single (manager, stat) → [teamIds] entry
  // Uses picksRef so we don't overwrite a stale picks closure.
  const updatePick = (managerId, statId, teamIds) => {
    if (!isOwnerRef.current) return;
    const current = picksRef.current || {};
    const next = {
      ...current,
      [managerId]: {
        ...(current[managerId] || {}),
        [statId]: teamIds,
      },
    };
    saveFantasyState('picks', next);
  };

  // updateMatchStat: set a single field on a single side of a single match
  const updateMatchStat = (matchId, side, field, value) => {
    if (!isOwnerRef.current) return;
    const current = matchStatsRef.current || {};
    const next = {
      ...current,
      [matchId]: {
        ...(current[matchId] || {}),
        [side]: {
          ...(current[matchId]?.[side] || {}),
          [field]: value,
        },
      },
    };
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
