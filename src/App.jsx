import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Settings, X, Trophy, Plus, Globe, Trash2, CheckCircle, LogOut, LayoutGrid, User, Mail, ShieldCheck } from 'lucide-react';
import { 
  onAuthStateChanged, signInAnonymously, GoogleAuthProvider, 
  signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink 
} from 'firebase/auth'; 
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// --- CONFIGURATION & UTILS ---
import { auth, db, appId } from './config/firebase.js';
import { DEFAULT_SCORING, generateAllMatches } from './config/data.js';
import { calculateStats } from './utils/tournamentLogic.js';

// --- HOOKS ---
import { useEspnSync } from './hooks/useEspnSync.js';
import { useTournamentEngine } from './hooks/useTournamentEngine.js';

// --- COMPONENTS & TABS ---
import { StandingsTab } from './components/tabs/StandingsTab.jsx';
import { GroupsTab } from './components/tabs/GroupsTab.jsx';
import { MatchesTab } from './components/tabs/MatchesTab.jsx';
import { TeamsTab } from './components/tabs/TeamsTab.jsx';
import { SettingsTab } from './components/tabs/SettingsTab.jsx';
import { BracketTab } from './components/tabs/BracketTab.jsx';
import { AccountModal } from './components/modals/AccountModal.jsx';
import { WelcomeModal } from './components/modals/WelcomeModal.jsx';

// 🚨 ADMIN SETUP 🚨
const SUPER_ADMIN_UID = "1u7dEIEfAcYvsovwF77Z6FHsBrT2";

const DEFAULT_6_USERS = [
  { id: 'm1', name: 'User 1', isKid: false },
  { id: 'm2', name: 'User 2', isKid: false },
  { id: 'm3', name: 'User 3', isKid: false },
  { id: 'm4', name: 'User 4', isKid: false },
  { id: 'm5', name: 'User 5', isKid: true },
  { id: 'm6', name: 'User 6', isKid: true }
];

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

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState('');
  const [pendingJoinName, setPendingJoinName] = useState('');

  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState(null);

  const isOwner = useMemo(() => {
    if (!user) return false;
    return hostedLeagues.some(l => l.id === activeLeagueId) || activeLeagueId === user.uid;
  }, [user, hostedLeagues, activeLeagueId]);

  const isViewer = !isOwner;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  const isAccountLinked = user && !user.isAnonymous; 

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
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            setShowAccountModal(true);
            setAuthMessage({ type: 'success', text: 'Successfully linked account!' });
            setTimeout(() => setShowAccountModal(false), 2000);
          } catch (err) {
            console.error("Magic link error:", err);
            setShowAccountModal(true);
            setAuthMessage({ type: 'error', text: "Link expired or invalid." });
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

  // --- CUSTOM HOOKS (Background Logic) ---
  useEspnSync(isSuperAdmin, settings, setMatches, saveState);
  
  useTournamentEngine({
    matches, setMatches, teamStats: calculateStats(matches, eliminatedTeams, settings, members, assignments).teamStats, 
    eliminatedTeams, setEliminatedTeams, manualRestores, settings, isOwner, isSuperAdmin, saveState
  });

  const handleGoogleLogin = async () => {
    try {
      setAuthMessage({ type: 'info', text: 'Opening Google Login...' });
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthMessage({ type: 'success', text: 'Successfully linked account!' });
      setTimeout(() => {
        setShowAccountModal(false);
        setAuthMessage(null);
      }, 1500);
    } catch (error) {
      console.error(error);
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload(); 
    } catch (err) {
      console.error(err);
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
                 
                 <button onClick={() => setShowAccountModal(true)} className={`p-2.5 rounded-lg shadow-sm transition-colors border flex items-center gap-2 shrink-0 ${isAccountLinked ? 'bg-emerald-700/90 hover:bg-emerald-800 border-emerald-600' : 'bg-slate-700/90 hover:bg-slate-800 border-slate-600'}`} title="My Account">
                   {isAccountLinked && user.photoURL ? (
                     <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full border border-emerald-400" />
                   ) : (
                     <User className="w-5 h-5 text-white sm:hidden" />
                   )}
                   <span className="hidden sm:block text-white font-black text-sm uppercase tracking-wider pr-1">
                     {isAccountLinked ? 'Linked' : 'Account'}
                   </span>
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
        <WelcomeModal 
          dontShowAgain={dontShowAgain} 
          setDontShowAgain={setDontShowAgain} 
          handleCloseWelcome={handleCloseWelcome} 
        />
      )}

      {showAccountModal && (
        <AccountModal 
          user={user} 
          isAccountLinked={isAccountLinked} 
          authEmail={authEmail} 
          setAuthEmail={setAuthEmail} 
          authMessage={authMessage} 
          setAuthMessage={setAuthMessage} 
          setShowAccountModal={setShowAccountModal} 
          handleGoogleLogin={handleGoogleLogin} 
          handleMagicLink={handleMagicLink} 
          handleLogout={handleLogout} 
        />
      )}
    </div>
  );
}