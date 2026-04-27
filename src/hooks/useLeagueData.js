import { useState, useEffect } from 'react';
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
};

/**
 * Subscribes to the active league's Firestore document and the global
 * matches document. Exposes all league state and the saveState writer.
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
  const [settings, setSettings] = useState({});

  // ─── Firestore subscriptions ──────────────────────────────────────────────

  useEffect(() => {
    if (!user || !activeLeagueId) return;
    setLoading(true);

    const leagueRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
    const globalMatchesRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');

    const unsubLeague = onSnapshot(leagueRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMembers(data.members || DEFAULT_6_USERS);
        setAssignments(data.assignments || {});
        setEliminatedTeams(data.eliminatedTeams || {});
        setManualRestores(data.manualRestores || {});
        setSettings(data.settings || DEFAULT_SETTINGS);

        // Keep the league name in the header dropdown in sync
        if (isOwner) {
          setHostedLeagues(prev => {
            const index = prev.findIndex(l => l.id === activeLeagueId);
            if (index !== -1 && prev[index].name !== (data.settings?.leagueName || DEFAULT_SETTINGS.leagueName)) {
              const newList = [...prev];
              newList[index] = { ...newList[index], name: data.settings.leagueName };
              setDoc(
                doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'leagues'),
                { list: newList }
              );
              return newList;
            }
            return prev;
          });
        }
      } else if (isOwner) {
        // First time this league has been opened — seed it with defaults
        setDoc(leagueRef, {
          members: DEFAULT_6_USERS,
          assignments: {},
          eliminatedTeams: {},
          manualRestores: {},
          settings: { ...DEFAULT_SETTINGS, leagueName: 'New Sweepstakes' },
        });
      }
    });

    const unsubGlobal = onSnapshot(globalMatchesRef, (docSnap) => {
      if (docSnap.exists()) {
        setMatches(docSnap.data().matches || generateAllMatches());
      } else if (user.uid === SUPER_ADMIN_UID) {
        setDoc(globalMatchesRef, { matches: generateAllMatches() });
      } else {
        setMatches(generateAllMatches());
      }
      setLoading(false);
    });

    return () => { unsubLeague(); unsubGlobal(); };
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
        if (!isSuperAdmin) return;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');
        await setDoc(ref, { matches: safeValue }, { merge: true });
      } else {
        if (!isOwner) return;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
        await setDoc(ref, { [key]: safeValue }, { merge: true });
      }
    } catch (err) {
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
    DEFAULT_6_USERS,
  };
};
