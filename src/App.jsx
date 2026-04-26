import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Settings, X, Trophy, Plus, Globe, Trash2, CheckCircle, LogOut, LayoutGrid, User, Mail, ShieldCheck } from 'lucide-react';
// IMPORTING AUTH PROVIDERS (Removed OAuthProvider since we dropped Yahoo/MS)
import { 
  onAuthStateChanged, signInAnonymously, GoogleAuthProvider, 
  signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink 
} from 'firebase/auth'; 
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// --- CONFIGURATION ---
import { auth, db, appId } from './config/firebase.js';
import { TEAMS_DATA, DEFAULT_SCORING, generateAllMatches } from './config/data.js';
import { calculateStats, getR32Mappings, sortGroupTeams, getThirdPlaceStandings } from './utils/tournamentLogic.js';
import { useEspnSync } from './hooks/useEspnSync.js';

// 🚨 ADMIN SETUP 🚨
// Paste your UID from the Account Modal here to become the Global Match Admin!
const SUPER_ADMIN_UID = "1u7dEIEfAcYvsovwF77Z6FHsBrT2";

// --- 6 DEFAULT USERS ---
const DEFAULT_6_USERS = [
  { id: 'm1', name: 'User 1', isKid: false },
  { id: 'm2', name: 'User 2', isKid: false },
  { id: 'm3', name: 'User 3', isKid: false },
  { id: 'm4', name: 'User 4', isKid: false },
  { id: 'm5', name: 'User 5', isKid: true },
  { id: 'm6', name: 'User 6', isKid: true }
];

// --- COMPONENTS & TABS ---
import { StandingsTab } from './components/tabs/StandingsTab.jsx';
import { GroupsTab } from './components/tabs/GroupsTab.jsx';
import { MatchesTab } from './components/tabs/MatchesTab.jsx';
import { TeamsTab } from './components/tabs/TeamsTab.jsx';
import { SettingsTab } from './components/tabs/SettingsTab.jsx';
import { BracketTab } from './components/tabs/BracketTab.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [hostedLeagues, setHostedLeagues] = useState([]);
  const [joinedLeagues, setJoinedLeagues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wcJoinedLeagues')) || []; } catch { return []; }
  });
  const [activeLeagueId, setActiveLeagueId] = useState(() => {
    try { return localStorage.getItem('wcActiveLeague') || null; } catch { return null; }
  });
  
  const [myLeagueName, setMyLeagueName] = useState(() => {
    try { return localStorage.getItem('wcMyLeagueName') || 'My Hosted Sweepstakes'; } catch { return 'My Hosted Sweepstakes'; }
  });

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState('');
  const [pendingJoinName, setPendingJoinName] = useState('');

  // Auth Modal States
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState(null);

  const isOwner = useMemo(() => {
    if (!user) return false;
    return hostedLeagues.some(l => l.id === activeLeagueId) || activeLeagueId === user.uid;
  }, [user, hostedLeagues, activeLeagueId]);

  const isViewer = !isOwner;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    try { return localStorage.getItem('hideWorldCupWelcome') !== 'true'; } catch { return true; }
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCloseWelcome = () => {
    if (dontShowAgain) {
      try { localStorage.setItem('hideWorldCupWelcome', 'true'); } catch (e) {}
    }
    setShowWelcomeModal(false);
  };
  
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [eliminatedTeams, setEliminatedTeams] = useState({});
  const [manualRestores, setManualRestores] = useState({});
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({});

  const [localTimezone, setLocalTimezone] = useState(() => {
    try {
      return localStorage.getItem('worldCupTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    } catch {
      return 'Europe/London';
    }
  });

  useEffect(() => {
    const initAuth = async () => {
      // Magic Link Interceptor
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
          } catch (err) {
            console.error("Magic link error:", err);
          }
        }
      }
      try { await signInAnonymously(auth); } catch (err) { console.error(err); }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const registryRef = doc(db, 'artifacts', appId, 'users', u.uid, 'metadata', 'leagues');
        const regSnap = await getDoc(registryRef);
        let ownedList = [];

        if (regSnap.exists()) {
          ownedList = regSnap.data().list || [];
        } else {
          ownedList = [{ id: u.uid, name: 'My First Sweepstakes' }];
          await setDoc(registryRef, { list: ownedList });
        }
        setHostedLeagues(ownedList);

        const urlParams = new URLSearchParams(window.location.search);
        const hostParam = urlParams.get('host');
        
        if (hostParam) {
          const isMine = ownedList.some(l => l.id === hostParam);
          const isJoined = joinedLeagues.some(l => l.id === hostParam);
          
          if (!isMine && !isJoined) {
            setPendingJoinCode(hostParam);
            setShowJoinModal(true);
          } else {
            setActiveLeagueId(hostParam);
            try { localStorage.setItem('wcActiveLeague', hostParam); } catch (e) {}
            window.history.replaceState({}, '', window.location.pathname);
          }
        } else if (!activeLeagueId) {
          setActiveLeagueId(u.uid);
          try { localStorage.setItem('wcActiveLeague', u.uid); } catch (e) {}
        }
      }
    });
    
    const emergencyTimeout = setTimeout(() => setLoading(false), 5000);
    return () => { unsubscribe(); clearTimeout(emergencyTimeout); };
  }, [activeLeagueId, joinedLeagues]);

  // --- DUAL-SYNC ENGINE (League Data + Global Matches) ---
  useEffect(() => {
    if (!user || !activeLeagueId) return;
    setLoading(true); 

    const leagueRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
    const globalMatchesRef = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');
    
    // 1. Sync Local League Details
    const unsubLeague = onSnapshot(leagueRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMembers(data.members || DEFAULT_6_USERS);
        setAssignments(data.assignments || {});
        setEliminatedTeams(data.eliminatedTeams || {});
        setManualRestores(data.manualRestores || {});
        setSettings(data.settings || { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'My Hosted Sweepstakes' });
        
        if (isOwner) {
          setHostedLeagues(prev => {
            const index = prev.findIndex(l => l.id === activeLeagueId);
            if (index !== -1 && prev[index].name !== (data.settings?.leagueName || 'My Hosted Sweepstakes')) {
              const newList = [...prev];
              newList[index] = { ...newList[index], name: data.settings.leagueName };
              setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'leagues'), { list: newList });
              return newList;
            }
            return prev;
          });
        }
      } else if (isOwner) {
        setDoc(leagueRef, {
          members: DEFAULT_6_USERS,
          assignments: {},
          eliminatedTeams: {},
          manualRestores: {},
          settings: { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'New Sweepstakes' }
        });
      }
    });

    // 2. Sync Global Match Scores
    const unsubGlobal = onSnapshot(globalMatchesRef, (docSnap) => {
      if (docSnap.exists()) {
        setMatches(docSnap.data().matches || generateAllMatches());
      } else if (user.uid === SUPER_ADMIN_UID) {
        setDoc(globalMatchesRef, { matches: generateAllMatches() });
      } else {
        setMatches(generateAllMatches()); // Fallback for non-admins until admin initializes
      }
      setLoading(false);
    });

    return () => { unsubLeague(); unsubGlobal(); };
  }, [user, activeLeagueId, isOwner]);

  const saveState = async (key, value) => {
    if (!user) return; 
    try {
      const safeValue = JSON.parse(JSON.stringify(value));
      if (key === 'matches') {
        if (!isSuperAdmin) return;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'globalMatches', 'worldCup2026');
        await setDoc(ref, { matches: safeValue }, { merge: true });
      } else {
        if (isViewer) return; 
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
        await setDoc(ref, { [key]: safeValue }, { merge: true });
      }
    } catch (err) {
      console.error("Error saving to cloud:", err);
    }
  };

  // --- ESPN AUTO-SYNC ENGINE ---
  useEspnSync(isSuperAdmin, settings, setMatches, saveState);

  // --- AUTHENTICATION HANDLERS ---
  const handleGoogleLogin = async () => {
    try {
      setAuthMessage({ type: 'info', text: 'Connecting to Google...' });
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthMessage({ type: 'success', text: 'Successfully linked account!' });
      setTimeout(() => {
        setShowAccountModal(false);
        setAuthMessage(null);
      }, 1500);
    } catch (error) {
      console.error(error);
      // Clean up common error messages for the user
      let errorMsg = error.message;
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign in was cancelled.';
      }
      setAuthMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleMagicLink = async () => {
    if (!authEmail) return;
    try {
      setAuthMessage({ type: 'info', text: 'Sending secure link...' });
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, authEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthMessage({ type: 'success', text: 'Success! Check your email inbox.' });
    } catch (error) {
      setAuthMessage({ type: 'error', text: error.message });
    }
  };

  const handleCreateLeague = async () => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newName = `New League ${hostedLeagues.length + 1}`;
    const newList = [...hostedLeagues, { id: newId, name: newName }];
    
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'leagues'), { list: newList });
    setHostedLeagues(newList);
    setActiveLeagueId(newId);
    try { localStorage.setItem('wcActiveLeague', newId); } catch (e) {}
    setShowJoinModal(false);
  };

  const handleSwitchLeague = (id) => {
    setActiveLeagueId(id);
    try { localStorage.setItem('wcActiveLeague', id); } catch (e) {}
  };

  const handleJoinSubmit = () => {
    if (!pendingJoinCode.trim() || !pendingJoinName.trim()) return;
    let finalCode = pendingJoinCode.trim();
    if (finalCode.includes('?host=')) {
      try { finalCode = new URL(finalCode).searchParams.get('host') || finalCode; } catch(e) {}
    }
    const currentLeagues = [...joinedLeagues];
    if (!currentLeagues.find(l => l.id === finalCode)) {
      const newLeagues = [...currentLeagues, { id: finalCode, name: pendingJoinName.trim() }];
      try { localStorage.setItem('wcJoinedLeagues', JSON.stringify(newLeagues)); } catch (e) {}
      setJoinedLeagues(newLeagues);
    }
    handleSwitchLeague(finalCode);
    setPendingJoinCode('');
    setPendingJoinName('');
    setShowJoinModal(false);
  };

  const confirmLeaveLeague = () => {
    if (!activeLeagueId) return;
    const newLeagues = joinedLeagues.filter(l => l.id !== activeLeagueId);
    setJoinedLeagues(newLeagues);
    try { localStorage.setItem('wcJoinedLeagues', JSON.stringify(newLeagues)); } catch (e) {}
    if (hostedLeagues.length > 0) handleSwitchLeague(hostedLeagues[0].id);
    setShowLeaveModal(false);
  };

  const handleResetData = () => {
    if (isViewer) return;
    const defaultSettings = { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: settings.leagueName || 'My Sweepstakes' };
    setMembers(DEFAULT_6_USERS);
    setAssignments({});
    setEliminatedTeams({});
    setManualRestores({});
    setSettings(defaultSettings);
    
    saveState('members', DEFAULT_6_USERS);
    saveState('assignments', {});
    saveState('eliminatedTeams', {});
    saveState('manualRestores', {});
    saveState('settings', defaultSettings);
    
    if (isSuperAdmin) {
      const resetMatches = generateAllMatches();
      setMatches(resetMatches);
      saveState('matches', resetMatches);
    }
    
    setShowSettingsModal(false);
  };

  const handleHardReset = async () => {
    try {
      localStorage.clear();
      await auth.signOut();
    } catch (e) {
      console.error("Failed to sign out fully:", e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  const { teamStats, memberStats, awards } = useMemo(() => {
    const stats = calculateStats(matches, eliminatedTeams, settings, members, assignments);
    if (stats.awards?.overall) {
      const first = stats.awards.overall['1st']?.id;
      const second = stats.awards.overall['2nd']?.id;
      const third = stats.awards.overall['3rd']?.id;
      if (third && (third === first || third === second)) {
        const sortedMembers = [...stats.memberStats].sort((a, b) => b.pts - a.pts);
        const eligibleThird = sortedMembers.find(m => m.id !== first && m.id !== second);
        if (eligibleThird) stats.awards.overall['3rd'] = eligibleThird;
        else delete stats.awards.overall['3rd'];
      }
    }
    return stats;
  }, [members, assignments, matches, eliminatedTeams, settings]);

  useEffect(() => {
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
  }, [matches, teamStats, eliminatedTeams, isOwner, isSuperAdmin, user, settings, manualRestores]);

  const handleRandomizeGroups = () => {
    if (!isSuperAdmin) return;
    const nextMatches = matches.map(m => (m.stage === 'Group' ? { ...m, scoreA: Math.floor(Math.random() * 4).toString(), scoreB: Math.floor(Math.random() * 4).toString(), isPlayed: true } : m));
    setMatches(nextMatches);
    saveState('matches', nextMatches);
  };

  const handleMatchUpdate = (matchId, field, value) => {
    if (!isSuperAdmin) return;
    const next = matches.map(m => m.id === matchId ? { ...m, [field]: value } : m);
    setMatches(next);
    saveState('matches', next);
  };

  const handleAssign = (teamId, memberId) => {
    const next = { ...assignments, [teamId]: memberId };
    setAssignments(next);
    saveState('assignments', next);
  };

  const toggleEliminated = (teamId) => {
    const isCurrentlyEliminated = !!eliminatedTeams[teamId];
    const nextElims = { ...eliminatedTeams, [teamId]: !isCurrentlyEliminated };
    const nextRestores = { ...manualRestores, [teamId]: isCurrentlyEliminated };
    setEliminatedTeams(nextElims);
    setManualRestores(nextRestores);
    saveState('eliminatedTeams', nextElims);
    saveState('manualRestores', nextRestores);
  };

  const handleAddMember = () => {
    const next = [...members, { id: `m${Date.now()}`, name: `User ${members.length + 1}`, isKid: false }];
    setMembers(next);
    saveState('members', next);
  };

  const handleUpdateMember = (id, field, value) => {
    const next = members.map(m => m.id === id ? { ...m, [field]: value } : m);
    setMembers(next);
    saveState('members', next);
  };

  const handleDeleteMember = (id) => {
    if (members.length <= 1) return;
    const nextMembers = members.filter(m => m.id !== id);
    setMembers(nextMembers);
    saveState('members', nextMembers);
    const nextAssignments = { ...assignments };
    Object.keys(nextAssignments).forEach(teamId => { if (nextAssignments[teamId] === id) delete nextAssignments[teamId]; });
    setAssignments(nextAssignments);
    saveState('assignments', nextAssignments);
  };

  const updateSettings = (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveState('settings', next);
  };

  const getOwnerName = (teamId) => {
    const ownerId = assignments[teamId];
    if (!ownerId) return 'Unassigned';
    const member = members.find(m => m.id === ownerId);
    return member ? member.name : 'Unassigned';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center text-green-100">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Lacing up boots...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 selection:bg-green-200 relative">
      <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white pt-10 pb-8 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,#fff_40px,#fff_80px)] pointer-events-none transform -skew-x-12 scale-150"></div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase drop-shadow-md flex items-center gap-3 mb-2 flex-wrap">
               <img src="/logos/world-cup.svg" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" alt="World Cup Logo" onError={(e) => e.target.style.display='none'} />
               World Cup 2026
               {isViewer ? (
                 <span className="bg-amber-500 text-amber-950 text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest shadow-md shrink-0">
                   Viewer
                 </span>
               ) : (
                 <span className="bg-indigo-500 text-indigo-50 text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest shadow-md shrink-0 flex items-center gap-1">
                   <ShieldCheck className="w-3 h-3" /> Commish
                 </span>
               )}
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 w-full sm:max-w-xl bg-white/10 p-2 sm:p-2.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-sm">
               <span className="text-xs font-bold text-green-200 uppercase tracking-widest pl-2 hidden sm:block">Active League:</span>
               <div className="flex w-full gap-2 items-center">
                 <div className="relative flex-1">
                   <select 
                     value={activeLeagueId || ''} 
                     onChange={e => handleSwitchLeague(e.target.value)}
                     className="w-full bg-white/90 text-slate-900 font-black text-sm sm:text-base py-2.5 pl-9 pr-4 rounded-lg appearance-none cursor-pointer border-0 focus:ring-2 focus:ring-emerald-400 shadow-inner"
                   >
                     {hostedLeagues.length > 0 && <optgroup label="👑 My Hosted Leagues">
                       {hostedLeagues.map(l => (
                         <option key={l.id} value={l.id}>{l.name} {activeLeagueId === l.id && '(Commish)'}</option>
                       ))}
                     </optgroup>}
                     {joinedLeagues.length > 0 && <optgroup label="👁️ Joined Leagues">
                       {joinedLeagues.map(l => (
                         <option key={l.id} value={l.id}>{l.name}</option>
                       ))}
                     </optgroup>}
                   </select>
                   <Trophy className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 {isViewer && (
                   <button onClick={() => setShowLeaveModal(true)} className="bg-red-500/90 hover:bg-red-500 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-red-400 flex items-center justify-center shrink-0" title="Remove this league">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={() => setShowJoinModal(true)} className="bg-emerald-500 hover:bg-emerald-400 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-emerald-400 flex items-center gap-1 shrink-0" title="Manage Leagues">
                   <Plus className="w-5 h-5 sm:hidden" />
                   <span className="hidden sm:block font-black text-sm uppercase tracking-wider px-2">Leagues</span>
                 </button>
                 
                 {/* ACCOUNT MODAL BUTTON */}
                 <button onClick={() => setShowAccountModal(true)} className="bg-slate-700/90 hover:bg-slate-800 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-slate-600 flex items-center gap-1 shrink-0" title="My Account">
                   <User className="w-5 h-5 sm:hidden" />
                   <span className="hidden sm:block font-black text-sm uppercase tracking-wider px-2">Account</span>
                 </button>
               </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 w-full md:w-auto mt-2 md:mt-0">
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {isOwner && (
                  <button onClick={() => setShowSettingsModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 rounded-xl transition-all shadow-md hover:shadow-lg font-black uppercase tracking-wider hover:-translate-y-0.5 border-b-4 border-green-200">
                    <Settings className="w-5 h-5" /> Admin Settings
                  </button>
                )}
             </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 -mt-5 relative z-20">
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/50 p-1.5 sm:p-2 flex overflow-x-auto gap-1.5 sm:gap-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {['standings', 'groups', 'bracket', 'matches', 'teams'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`shrink-0 flex-1 min-w-[85px] sm:min-w-0 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 snap-start ${
                activeTab === tab ? 'bg-green-600 text-white shadow-md sm:scale-[1.02]' : 'bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-10">
        {activeTab === 'standings' && <StandingsTab settings={settings} awards={awards} memberStats={memberStats} />}
        {activeTab === 'groups' && <GroupsTab teamStats={teamStats} matches={matches} settings={settings} />}
        {activeTab === 'bracket' && <BracketTab matches={matches} members={members} assignments={assignments} />}
        {activeTab === 'matches' && <MatchesTab matches={matches} localTimezone={localTimezone} setLocalTimezone={setLocalTimezone} isViewer={!isSuperAdmin} handleMatchUpdate={handleMatchUpdate} getOwnerName={getOwnerName} eliminatedTeams={eliminatedTeams} handleRandomizeGroups={handleRandomizeGroups} />}
        {activeTab === 'teams' && <TeamsTab eliminatedTeams={eliminatedTeams} isViewer={isViewer} assignments={assignments} members={members} handleAssign={handleAssign} toggleEliminated={toggleEliminated} />}
      </main>

      {/* --- ALL MODALS BELOW --- */}

      {showLeaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border-4 border-red-600">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <LogOut className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Leave League?</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Are you sure you want to remove this league from your list? You can always rejoin later with the invite link.</p>
              </div>
              <div className="flex w-full gap-3 mt-4">
                <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
                <button onClick={confirmLeaveLeague} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-md">Leave League</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-4 border-emerald-600 relative">
            <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-100 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-6 border-b-2 border-emerald-50 pb-4">
               <LayoutGrid className="w-8 h-8 text-emerald-600 bg-emerald-100 p-1.5 rounded-lg" />
               <h2 className="text-xl font-black text-emerald-800 uppercase tracking-widest">Manage Leagues</h2>
            </div>
            <div className="space-y-6">
               <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Join a League</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">League Invite Code (or URL)</label>
                    <input type="text" placeholder="Paste link here" value={pendingJoinCode} onChange={e => setPendingJoinCode(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nickname for this League</label>
                    <input type="text" placeholder="e.g. The Office Pool" value={pendingJoinName} onChange={e => setPendingJoinName(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none" />
                  </div>
                  <button onClick={handleJoinSubmit} disabled={!pendingJoinCode.trim() || !pendingJoinName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-md uppercase tracking-widest transition-all">
                    Add to My Leagues
                  </button>
               </div>

               <div className="pt-4 border-t-2 border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Host Your Own</h3>
                  <button onClick={handleCreateLeague} className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Create New Sweepstakes
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-green-800 relative">
             <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 p-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
                  <Settings className="w-6 h-6 text-slate-500" /> Sweepstakes Rules & Settings
                </h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <div className="p-6">
                <SettingsTab 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  members={members} 
                  handleAddMember={handleAddMember} 
                  handleUpdateMember={handleUpdateMember} 
                  handleDeleteMember={handleDeleteMember} 
                  handleResetData={handleResetData} 
                  handleHardReset={handleHardReset}
                  userUid={activeLeagueId} 
                />
             </div>
           </div>
        </div>
      )}

      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-4 border-emerald-600 relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-fade-in">
             <div className="bg-gradient-to-r from-green-800 to-emerald-700 text-white p-4 sm:p-5 flex justify-between items-center shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#fff_20px,#fff_40px)] pointer-events-none transform -skew-x-12 scale-150"></div>
                <h2 className="text-lg sm:text-2xl font-black flex items-center gap-3 relative z-10"><img src="/logos/world-cup.svg" className="w-6 h-6 sm:w-8 sm:h-8" alt="" onError={(e) => e.target.style.display='none'} /> World Cup Sweepstakes</h2>
                <button onClick={handleCloseWelcome} className="text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors relative z-10"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
             </div>
             <div className="p-4 sm:p-5 space-y-3 text-slate-700 overflow-y-auto">
                <p className="text-base sm:text-lg font-medium leading-relaxed">Welcome to a place to help to keep track of your World Cup Sweepstakes with your Friends, Family, Colleagues, or complete strangers!</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mt-2 space-y-2 sm:space-y-3">
                   <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm border-b border-slate-200 pb-2">How It Works:</h3>
                   <ul className="space-y-2 text-xs sm:text-sm">
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Participants:</strong> Head over to the Admin Settings to add all sweepstakes participants.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Teams:</strong> Once all teams have been drawn head to the Teams tab to assign everyone.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Live Scoring:</strong> You earn points every time your teams win, draw, score goals, or keep a clean sheet. Make sure to check the settings tab to customise your scoring.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Matches:</strong> As matches finish the groups and knockout tabs will automatically update and populate the routes for the winners.</span></li>
                   </ul>
                </div>
             </div>
             <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer" />
                  <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors select-none">Don't show this again</span>
                </label>
                <button onClick={handleCloseWelcome} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 uppercase tracking-wider">Let's Go!</button>
             </div>
           </div>
        </div>
      )}

      {/* ACCOUNT & LOGIN MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md border-4 border-slate-200 relative">
            <button onClick={() => { setShowAccountModal(false); setAuthMessage(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            
            <div className="flex flex-col items-center text-center space-y-3 mb-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-wide">Your Account</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium px-2">
                  You are currently playing as an <strong>Anonymous Guest</strong>. Link an account below to save your leagues and access them on any device!
                </p>
              </div>
            </div>

            {/* ERROR/SUCCESS MESSAGES */}
            {authMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-bold text-center ${
                authMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                authMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {authMessage.text}
              </div>
            )}

            <div className="space-y-6">
              {/* SOCIAL BUTTONS ROW */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 pb-2">Link Social Account</h4>
                <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-black py-3.5 rounded-xl transition-all shadow-sm hover:shadow">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 border-t border-slate-200"></div>
                <span className="relative bg-white px-4 text-xs font-black text-slate-300 uppercase tracking-widest">OR</span>
              </div>

              {/* EMAIL MAGIC LINK */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Send Email Magic Link</h4>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="Enter your email address" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                    />
                  </div>
                  <button onClick={handleMagicLink} disabled={!authEmail} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-md uppercase tracking-wider transition-all hover:-translate-y-0.5">
                    Send Link
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed px-4">
                  We'll send a secure link to your inbox. Click it to instantly link your devices. No passwords required!
                </p>
              </div>

              {/* SUPER ADMIN COPY UI */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Admin Developer Tool:</p>
                <code className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded selection:bg-indigo-200">
                  UID: {user?.uid || 'Loading...'}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}