import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, SUPER_ADMIN_UID } from '../config/firebase.js';
import { generateAllMatches } from '../config/data.js';

const DEFAULT_6_USERS = [
  { id: 'm1', name: 'User 1', isKid: false },
  { id: 'm2', name: 'User 2', isKid: false },
  { id: 'm3', name: 'User 3', isKid: false },
  { id: 'm4', name: 'User 4', isKid: false },
  { id: 'm5', name: 'User 5', isKid: true },
  { id: 'm6', name: 'User 6', isKid: true },
];

const DEFAULT_SETTINGS = {
  woodenSpoon: true,
  kidAwards: true,
  kidAwardsType: 'all',
  leagueName: 'My Hosted Sweepstakes',
  autoSync: false,
  fantasyMode: false,
};

/**
 * Subscribes to the active league's Firestore document and the correct
 * matches source depending on the league's autoSync setting:
 *
 *   autoSync = true  → reads from the shared globalMatches document
 *                       (super admin writes live ESPN scores here)
 *   autoSync = false → reads from a per-league matches document
 *                       (commish can edit scores manually)
 *
 * The randomize-reverts bug is fixed by making setMatches the ONLY place
 * that updates match state — handlers no longer call setMatches directly,
 * they just write to Firestore and let onSnapshot propagate the change back.
 * A short debounce ref prevents the snapshot from firing during a local write.
 */
export const useLeagueData = ({
  user,
  activeLeagueId,
  isOwner,
  isSuperAdmin,
  setHostedLeagues,
  setLoading,
}) => {
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [eliminatedTeams, setEliminatedTeams] = useState({});
  const [manualRestores, setManualRestores] = useState({});
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Prevents the tournament engine from running until this league's
  // data has fully arrived from Firestore
  const [leagueDataReady, setLeagueDataReady] = useState(false);

  // Track whether we are mid-write so the snapshot doesn't race against us
  const writingRef = useRef(false);

  // ─── Firestore subscriptions ──────────────────────────────────────────────

  useEffect(() => {
    if (!user || !activeLeagueId) return;
    setLoading(true);

    // ── Reset immediately so stale data from the previous league never
    // bleeds through while we wait for the new league's snapshot ──────
    setLeagueDataReady(false);
    setMembers([]);
    setAssignments({});
    setEliminatedTeams({});
    setManualRestores({});
    setSettings(DEFAULT_SETTINGS);

    const leagueRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
    const globalMatchesRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');
    const localMatchesRef = doc(db, 'artifacts', appId, 'public', 'data', 'leagueMatches', activeLeagueId);

    let unsubMatches = () => {};

    const unsubLeague = onSnapshot(leagueRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newSettings = data.settings || DEFAULT_SETTINGS;
        setMembers(data.members || DEFAULT_6_USERS);
        setAssignments(data.assignments || {});
        setEliminatedTeams(data.eliminatedTeams || {});
        setManualRestores(data.manualRestores || {});
        setSettings(newSettings);

        // Keep the league name in sync in the header dropdown
        if (isOwner) {
          setHostedLeagues(prev => {
            const index = prev.findIndex(l => l.id === activeLeagueId);
            if (index !== -1 && prev[index].name !== (newSettings?.leagueName || DEFAULT_SETTINGS.leagueName)) {
              const newList = [...prev];
              newList[index] = { ...newList[index], name: newSettings.leagueName };
              setDoc(
                doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'leagues'),
                { list: newList }
              );
              return newList;
            }
            return prev;
          });
        }

        // Subscribe to the correct matches source based on autoSync setting.
        // We re-subscribe whenever autoSync changes so we always read from
        // the right place.
        unsubMatches(); // cancel any previous matches subscription

        if (newSettings.autoSync) {
          // ── Auto-sync ON: read from shared global matches (super admin writes) ──
          unsubMatches = onSnapshot(globalMatchesRef, (snap) => {
            if (writingRef.current) return;
            if (snap.exists()) {
              setMatches(snap.data().matches || generateAllMatches());
            } else {
              setMatches(generateAllMatches());
            }
            setLoading(false);
            setLeagueDataReady(true);
          });
        } else {
          // ── Auto-sync OFF: read from per-league matches (commish edits manually) ──
          unsubMatches = onSnapshot(localMatchesRef, (snap) => {
            if (writingRef.current) return;
            if (snap.exists()) {
              setMatches(snap.data().matches || generateAllMatches());
            } else {
              const seedMatches = generateAllMatches();
              setMatches(seedMatches);
              if (isOwner) {
                setDoc(localMatchesRef, { matches: seedMatches });
              }
            }
            setLoading(false);
            setLeagueDataReady(true);
          });
        }

      } else if (isOwner) {
        setDoc(leagueRef, {
          members: DEFAULT_6_USERS,
          assignments: {},
          eliminatedTeams: {},
          manualRestores: {},
          settings: { ...DEFAULT_SETTINGS, leagueName: 'New Sweepstakes' },
        });
      }
    });

    return () => {
      unsubLeague();
      unsubMatches();
    };
  }, [user, activeLeagueId, isOwner]);

  // ─── Cloud writer ─────────────────────────────────────────────────────────

  const saveState = async (key, value) => {
    if (!user) return;
    try {
      const serialised = JSON.stringify(value);
      if (serialised.length > 500_000) {
        console.error(`saveState: payload for "${key}" is too large (${serialised.length} bytes), refusing to save.`);
        return;
      }
      const safeValue = JSON.parse(serialised);

      if (key === 'matches') {
        const autoSync = settings.autoSync;

        if (autoSync) {
          // Auto-sync ON: only super admin can write to the global matches table
          if (!isSuperAdmin) return;
          writingRef.current = true;
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');
          await setDoc(ref, { matches: safeValue }, { merge: true });
          writingRef.current = false;
        } else {
          // Auto-sync OFF: league commish writes to their own matches document
          if (!isOwner) return;
          writingRef.current = true;
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'leagueMatches', activeLeagueId);
          await setDoc(ref, { matches: safeValue }, { merge: true });
          writingRef.current = false;
        }
      } else {
        if (!isOwner) return;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
        await setDoc(ref, { [key]: safeValue }, { merge: true });
      }
    } catch (err) {
      writingRef.current = false;
      console.error('Error saving to cloud:', err);
    }
  };

  return {
    members, setMembers,
    assignments, setAssignments,
    eliminatedTeams, setEliminatedTeams,
    manualRestores, setManualRestores,
    matches, setMatches,
    settings, setSettings,
    saveState,
    leagueDataReady,
    DEFAULT_6_USERS,
  };
};
