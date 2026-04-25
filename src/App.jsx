import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Settings, X, Trophy, Plus, Globe, Trash2, CheckCircle } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'; 
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION ---
import { auth, db, appId } from './config/firebase.js';
import { TEAMS_DATA, INITIAL_MEMBERS, DEFAULT_SCORING, generateAllMatches } from './config/data.js';
import { calculateStats, getR32Mappings, sortGroupTeams, getThirdPlaceStandings } from './utils/tournamentLogic.js';

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
  
  // --- SAFELY WRAPPED LOCAL STORAGE STATE ---
  const [joinedLeagues, setJoinedLeagues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wcJoinedLeagues')) || []; } catch { return []; }
  });
  const [activeLeagueId, setActiveLeagueId] = useState(() => {
    try { return localStorage.getItem('wcActiveLeague') || null; } catch { return null; }
  });
  
  // NEW: State for your own custom league name!
  const [myLeagueName, setMyLeagueName] = useState(() => {
    try { return localStorage.getItem('wcMyLeagueName') || 'My Hosted Sweepstakes'; } catch { return 'My Hosted Sweepstakes'; }
  });

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState('');
  const [pendingJoinName, setPendingJoinName] = useState('');

  const isViewer = user ? activeLeagueId !== user.uid : true;

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
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({});

  const [localTimezone, setLocalTimezone] = useState(() => {
    try {
      return localStorage.getItem('worldCupTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    } catch {
      return 'Europe/London';
    }
  });

  // --- AUTH & URL INTERCEPTION ---
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (err) { console.error("Auth error details:", err); }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const urlParams = new URLSearchParams(window.location.search);
        const hostParam = urlParams.get('host');
        
        if (hostParam && hostParam !== u.uid) {
          const existing = joinedLeagues.find(l => l.id === hostParam);
          if (!existing) {
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

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!user || !activeLeagueId) return;
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', activeLeagueId);
    
    setLoading(true); 
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMembers(data.members || INITIAL_MEMBERS);
        setAssignments(data.assignments || {});
        setEliminatedTeams(data.eliminatedTeams || {});
        setSettings(data.settings || { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'My Hosted Sweepstakes' });
        
        // NEW: If you are looking at your own league, save the custom name to local storage for the dropdown!
        if (activeLeagueId === user.uid) {
          const customName = data.settings?.leagueName || 'My Hosted Sweepstakes';
          setMyLeagueName(customName);
          try { localStorage.setItem('wcMyLeagueName', customName); } catch (e) {}
        }

        if (data.matches) {
          const freshMatches = generateAllMatches();
          const mergedMatches = freshMatches.map(freshMatch => {
             const savedMatch = data.matches.find(m => m.id === freshMatch.id);
             if (savedMatch) {
               return {
                 ...freshMatch, 
                 scoreA: (savedMatch.scoreA !== undefined && savedMatch.scoreA !== '') ? savedMatch.scoreA : '0',
                 scoreB: (savedMatch.scoreB !== undefined && savedMatch.scoreB !== '') ? savedMatch.scoreB : '0',
                 isPlayed: savedMatch.isPlayed || false,
                 isAET: savedMatch.isAET || false,
                 penWinner: savedMatch.penWinner || null,
                 penScoreA: savedMatch.penScoreA || '',
                 penScoreB: savedMatch.penScoreB || '',
                 teamA: freshMatch.teamA !== '' ? freshMatch.teamA : (savedMatch.teamA || ''),
                 teamB: freshMatch.teamB !== '' ? freshMatch.teamB : (savedMatch.teamB || '')
               };
             }
             return freshMatch;
          });
          setMatches(mergedMatches);
        } else {
          setMatches(generateAllMatches());
        }
      } else {
        setMembers(INITIAL_MEMBERS);
        setAssignments({});
        setEliminatedTeams({});
        setMatches(generateAllMatches());
        setSettings({ woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'My Hosted Sweepstakes' });
        
        if (activeLeagueId === user.uid) {
          setDoc(docRef, {
            members: INITIAL_MEMBERS,
            assignments: {},
            eliminatedTeams: {},
            matches: generateAllMatches(),
            settings: { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'My Hosted Sweepstakes' }
          });
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeLeagueId]);

  const saveState = async (key, value) => {
    if (!user || isViewer) return; 
    try {
      const safeValue = JSON.parse(JSON.stringify(value));
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', user.uid);
      await setDoc(docRef, { [key]: safeValue }, { merge: true });
    } catch (err) {
      console.error("Error saving to cloud:", err);
    }
  };

  const handleSwitchLeague = (id) => {
    setActiveLeagueId(id);
    try { localStorage.setItem('wcActiveLeague', id); } catch (e) {}
  };

  const handleJoinSubmit = () => {
    if (!pendingJoinCode.trim() || !pendingJoinName.trim()) return;
    
    let finalCode = pendingJoinCode.trim();
    if (finalCode.includes('?host=')) {
      try {
        finalCode = new URL(finalCode).searchParams.get('host') || finalCode;
      } catch(e) {}
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
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleLeaveLeague = () => {
    if (!activeLeagueId || activeLeagueId === user?.uid) return;
    
    if (window.confirm("Are you sure you want to remove this league from your list? You can always rejoin later with the invite link.")) {
      const newLeagues = joinedLeagues.filter(l => l.id !== activeLeagueId);
      setJoinedLeagues(newLeagues);
      try { localStorage.setItem('wcJoinedLeagues', JSON.stringify(newLeagues)); } catch (e) {}
      
      if (user) handleSwitchLeague(user.uid);
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleResetData = () => {
    if (isViewer) return;
    if (window.confirm("🚨 WARNING: Are you sure you want to reset the entire tournament? This will erase all match scores, team assignments, and custom rules!")) {
      const resetMatches = generateAllMatches();
      const defaultSettings = { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all', leagueName: 'My Hosted Sweepstakes' };
      
      setMembers(INITIAL_MEMBERS);
      setAssignments({});
      setEliminatedTeams({});
      setMatches(resetMatches);
      setSettings(defaultSettings);

      saveState('members', INITIAL_MEMBERS);
      saveState('assignments', {});
      saveState('eliminatedTeams', {});
      saveState('matches', resetMatches);
      saveState('settings', defaultSettings);
      
      setShowSettingsModal(false);
      setActiveTab('standings');
    }
  };

  const { teamStats, memberStats, awards } = useMemo(() => {
    const stats = calculateStats(matches, eliminatedTeams, settings, members, assignments);
    if (stats.awards?.overall) {
      const first = stats.awards.overall['1st']?.id;
      const second = stats.awards.overall['2nd']?.id;
      const third = stats.awards.overall['3rd']?.id;
      if (third && (third === first || third === second)) {
        const sortedMembers = Object.values(stats.memberStats).sort((a, b) => b.points - a.points);
        const eligibleThird = sortedMembers.find(m => m.id !== first && m.id !== second);
        if (eligibleThird) {
          stats.awards.overall['3rd'] = { id: eligibleThird.id, reason: '3rd Most Points' };
        } else {
          delete stats.awards.overall['3rd'];
        }
      }
    }
    return stats;
  }, [members, assignments, matches, eliminatedTeams, settings]);

  useEffect(() => {
    if (isViewer || matches.length === 0 || Object.keys(teamStats).length === 0) return;

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
          if (!nextEliminations[fourthPlaceId]) {
            nextEliminations[fourthPlaceId] = true;
            newlyEliminated = true;
          }
        }
      }
    });

    if (groupMatchesPlayed === 72) {
       const thirdsList = getThirdPlaceStandings(teamStats, nextMatches, settings);
       thirdsList.slice(8).forEach(t => {
          if (!nextEliminations[t.id]) {
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
         if (loserId && !nextEliminations[loserId]) {
            nextEliminations[loserId] = true;
            newlyEliminated = true;
         }
      }
    });

    if (newlyEliminated) {
      setEliminatedTeams(nextEliminations);
      saveState('eliminatedTeams', nextEliminations);
    }
    if (hasMatchesChanges) {
      setMatches(nextMatches);
      saveState('matches', nextMatches);
    }
  }, [matches, teamStats, eliminatedTeams, isViewer, user, settings]);

  const handleRandomizeGroups = () => {
    if (isViewer) return;
    const nextMatches = matches.map(m => {
      if (m.stage === 'Group') {
        return { ...m, scoreA: Math.floor(Math.random() * 4).toString(), scoreB: Math.floor(Math.random() * 4).toString(), isPlayed: true };
      }
      return m;
    });
    setMatches(nextMatches);
    saveState('matches', nextMatches);
  };

  const handleMatchUpdate = (matchId, field, value) => {
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
    const next = { ...eliminatedTeams, [teamId]: !eliminatedTeams[teamId] };
    setEliminatedTeams(next);
    saveState('eliminatedTeams', next);
  };

  const handleAddMember = () => {
    const next = [...members, { id: `m${Date.now()}`, name: 'New Member', isKid: false }];
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
    Object.keys(nextAssignments).forEach(teamId => {
      if (nextAssignments[teamId] === id) delete nextAssignments[teamId];
    });
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
               {isViewer && (
                 <span className="bg-amber-500 text-amber-950 text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-widest shadow-md shrink-0">
                   Viewer
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
                     {/* Displays your custom league name! */}
                     {user && <option value={user.uid}>👑 {myLeagueName}</option>}
                     {joinedLeagues.map(l => (
                       <option key={l.id} value={l.id}>👁️ {l.name}</option>
                     ))}
                   </select>
                   <Trophy className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 {user && activeLeagueId !== user.uid && (
                   <button onClick={handleLeaveLeague} className="bg-red-500/90 hover:bg-red-500 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-red-400 flex items-center justify-center shrink-0" title="Remove this league">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={() => setShowJoinModal(true)} className="bg-emerald-500 hover:bg-emerald-400 text-white p-2.5 rounded-lg shadow-sm transition-colors border border-emerald-400 flex items-center gap-1 shrink-0" title="Join another league">
                   <Plus className="w-5 h-5 sm:hidden" />
                   <span className="hidden sm:block font-black text-sm uppercase tracking-wider px-2">+ Join</span>
                 </button>
               </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 w-full md:w-auto mt-2 md:mt-0">
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!isViewer && user && (
                  <button onClick={() => setShowSettingsModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 rounded-xl transition-all shadow-md hover:shadow-lg font-black uppercase tracking-wider hover:-translate-y-0.5 border-b-4 border-green-200">
                    <Settings className="w-5 h-5" /> Admin Settings
                  </button>
                )}
             </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 -mt-5 relative z-20">
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/50 p-1.5 sm:p-2 flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
          {['standings', 'groups', 'bracket', 'matches', 'teams'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-2.5 sm:py-3 px-1 sm:px-4 rounded-lg font-black text-[9px] min-[375px]:text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
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
        {activeTab === 'matches' && <MatchesTab matches={matches} localTimezone={localTimezone} setLocalTimezone={setLocalTimezone} isViewer={isViewer} handleMatchUpdate={handleMatchUpdate} getOwnerName={getOwnerName} eliminatedTeams={eliminatedTeams} handleRandomizeGroups={handleRandomizeGroups} />}
        {/* REMOVED UNUSED getOwnerName PROP HERE */}
        {activeTab === 'teams' && <TeamsTab eliminatedTeams={eliminatedTeams} isViewer={isViewer} assignments={assignments} members={members} handleAssign={handleAssign} toggleEliminated={toggleEliminated} />}
      </main>

      {showJoinModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-4 border-emerald-600 relative">
            <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-100 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-6 border-b-2 border-emerald-50 pb-4">
               <Globe className="w-8 h-8 text-emerald-600 bg-emerald-100 p-1.5 rounded-lg" />
               <h2 className="text-xl font-black text-emerald-800 uppercase tracking-widest">Join a League</h2>
            </div>
            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">League Invite Code (or URL)</label>
                 <input type="text" placeholder="e.g. paste the link here" value={pendingJoinCode} onChange={e => setPendingJoinCode(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 focus:ring-0 outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Nickname for this League</label>
                 <input type="text" placeholder="e.g. The Office Pool" value={pendingJoinName} onChange={e => setPendingJoinName(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 focus:ring-0 outline-none" />
               </div>
               <button onClick={handleJoinSubmit} disabled={!pendingJoinCode.trim() || !pendingJoinName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-md uppercase tracking-widest mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5">
                 Add to My Leagues
               </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-green-800 relative">
             <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 p-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
                  <Settings className="w-6 h-6 text-slate-500" /> Sweepstakes Rules & Settings
                </h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <div className="p-6">
                <SettingsTab settings={settings} updateSettings={updateSettings} members={members} handleAddMember={handleAddMember} handleUpdateMember={handleUpdateMember} handleDeleteMember={handleDeleteMember} handleResetData={handleResetData} userUid={user?.uid} />
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
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Teams:</strong> Once you have drawn the teams for your sweepstakes make sure to update the Teams section.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Live Scoring:</strong> You earn points every time your teams win, draw, score goals, or keep a clean sheet. Make sure to check the settings tab to customise your scoring.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Bracket:</strong> As matches finish, the Knockout Bracket automatically populates and routes the winners.</span></li>
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
    </div>
  );
}