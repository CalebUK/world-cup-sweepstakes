import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Share2, CheckCircle, Settings, Info, X } from 'lucide-react';
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
  
  const urlParams = new URLSearchParams(window.location.search);
  const hostIdParam = urlParams.get('host');
  const isViewer = !!hostIdParam;
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return localStorage.getItem('hideWorldCupWelcome') !== 'true';
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCloseWelcome = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideWorldCupWelcome', 'true');
    }
    setShowWelcomeModal(false);
  };
  
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [eliminatedTeams, setEliminatedTeams] = useState({});
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({});

  const [localTimezone, setLocalTimezone] = useState(() => {
    return localStorage.getItem('worldCupTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error details:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    
    const emergencyTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(emergencyTimeout);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const targetUid = isViewer ? hostIdParam : user.uid;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sweepstakes', targetUid);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setMembers(data.members || INITIAL_MEMBERS);
        setAssignments(data.assignments || {});
        setEliminatedTeams(data.eliminatedTeams || {});
        setSettings(data.settings || { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all' });
        
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
                 penWinner: savedMatch.penWinner || null,
                 penScoreA: savedMatch.penScoreA || '', // <-- NEW PENALTY INGEST
                 penScoreB: savedMatch.penScoreB || '', // <-- NEW PENALTY INGEST
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
        setSettings({ woodenSpoon: true, kidAwards: true, kidAwardsType: 'all' });
        
        if (!isViewer) {
          setDoc(docRef, {
            members: INITIAL_MEMBERS,
            assignments: {},
            eliminatedTeams: {},
            matches: generateAllMatches(),
            settings: { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all' }
          });
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isViewer, hostIdParam]);

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

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('host', user.uid);
    const linkToCopy = url.toString();
    
    const textArea = document.createElement("textarea");
    textArea.value = linkToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const handleResetData = () => {
    if (isViewer) return;
    if (window.confirm("🚨 WARNING: Are you sure you want to reset the entire tournament? This will erase all match scores, team assignments, and custom rules!")) {
      const resetMatches = generateAllMatches();
      const defaultSettings = { woodenSpoon: true, kidAwards: true, kidAwardsType: 'all' };
      
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
    return calculateStats(matches, eliminatedTeams, settings, members, assignments);
  }, [members, assignments, matches, eliminatedTeams, settings]);


  // --- CENTRAL AUTOMATION ENGINE ---
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
             else {
               // --- NEW PENALTY LOGIC ---
               const pA = parseInt(m.penScoreA);
               const pB = parseInt(m.penScoreB);
               if (!isNaN(pA) && !isNaN(pB)) {
                 if (pA > pB) winnerId = m.teamA;
                 else if (pB > pA) winnerId = m.teamB;
               } else if (m.penWinner) {
                 winnerId = m.penWinner; // Fallback to old radio button if exists
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
           else {
             // --- NEW PENALTY LOGIC ---
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
        return {
          ...m,
          scoreA: Math.floor(Math.random() * 4).toString(),
          scoreB: Math.floor(Math.random() * 4).toString(),
          isPlayed: true
        };
      }
      return m;
    });
    setMatches(nextMatches);
    saveState('matches', nextMatches);
  };


  const handleMatchUpdate = (matchId, field, value) => {
    setMatches(prev => {
      const next = prev.map(m => m.id === matchId ? { ...m, [field]: value } : m);
      saveState('matches', next);
      return next;
    });
  };

  const handleAssign = (teamId, memberId) => {
    setAssignments(prev => {
      const next = { ...prev, [teamId]: memberId };
      saveState('assignments', next);
      return next;
    });
  };

  const toggleEliminated = (teamId) => {
    setEliminatedTeams(prev => {
      const next = { ...prev, [teamId]: !prev[teamId] };
      saveState('eliminatedTeams', next);
      return next;
    });
  };

  const handleAddMember = () => {
    setMembers(prev => {
      const next = [...prev, { id: `m${Date.now()}`, name: 'New Member', isKid: false }];
      saveState('members', next);
      return next;
    });
  };

  const handleUpdateMember = (id, field, value) => {
    setMembers(prev => {
      const next = prev.map(m => m.id === id ? { ...m, [field]: value } : m);
      saveState('members', next);
      return next;
    });
  };

  const handleDeleteMember = (id) => {
    if (members.length <= 1) return;
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id);
      saveState('members', next);
      return next;
    });
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(teamId => {
        if (next[teamId] === id) delete next[teamId];
      });
      saveState('assignments', next);
      return next;
    });
  };

  const updateSettings = (updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      saveState('settings', next);
      return next;
    });
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
      
      {/* HEADER */}
      <header className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white pt-12 pb-8 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,#fff_40px,#fff_80px)] pointer-events-none transform -skew-x-12 scale-150"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase drop-shadow-md flex items-center gap-4">
                 <img src="/logos/world-cup.svg" className="w-12 h-12 object-contain" alt="World Cup Logo" onError={(e) => e.target.style.display='none'} />
                 World Cup 2026
              </h1>
              {isViewer && (
                <span className="bg-amber-500 text-amber-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  Viewer Mode
                </span>
              )}
            </div>
            <p className="text-green-200 font-bold uppercase tracking-widest text-sm ml-2 opacity-90">Official Family Sweepstakes Dashboard</p>
          </div>
          
          <div className="flex flex-col items-stretch gap-3 w-full md:w-auto mt-4 md:mt-0">
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!isViewer && user && (
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all backdrop-blur-sm group font-bold shadow-sm"
                  >
                    <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Settings
                  </button>
                )}
                
                {!isViewer && user && (
                  <button 
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg transition-all backdrop-blur-sm group shadow-sm"
                  >
                    {copySuccess ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {copySuccess ? 'Link Copied!' : 'Share Viewer Link'}
                  </button>
                )}
             </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION BAR */}
      <div className="max-w-6xl mx-auto px-4 -mt-5 relative z-20">
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/50 p-2 flex flex-wrap gap-2">
          {['standings', 'groups', 'bracket', 'matches', 'teams'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[60px] sm:min-w-[80px] py-3 px-1 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab 
                  ? 'bg-green-600 text-white shadow-md scale-[1.02]' 
                  : 'bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 mt-10">
        {activeTab === 'standings' && (
          <StandingsTab settings={settings} awards={awards} memberStats={memberStats} />
        )}
        
        {activeTab === 'groups' && (
          <GroupsTab teamStats={teamStats} matches={matches} settings={settings} />
        )}
        
        {activeTab === 'bracket' && (
          <BracketTab 
            matches={matches} 
            members={members} 
            assignments={assignments}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesTab 
            matches={matches} 
            localTimezone={localTimezone} 
            setLocalTimezone={setLocalTimezone}
            isViewer={isViewer} 
            handleMatchUpdate={handleMatchUpdate} 
            getOwnerName={getOwnerName} 
            eliminatedTeams={eliminatedTeams}
            handleRandomizeGroups={handleRandomizeGroups}
          />
        )}
        
        {activeTab === 'teams' && (
          <TeamsTab 
            eliminatedTeams={eliminatedTeams} 
            isViewer={isViewer} 
            getOwnerName={getOwnerName} 
            assignments={assignments} 
            members={members} 
            handleAssign={handleAssign} 
            toggleEliminated={toggleEliminated} 
          />
        )}
      </main>

      {/* SETTINGS MODAL */}
      {showSettingsModal && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-green-800 relative">
             <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 p-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-black text-green-800 flex items-center gap-2 uppercase tracking-wide">
                  <Settings className="w-6 h-6 text-slate-500" /> Sweepstakes Rules & Settings
                </h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors">
                   <X className="w-6 h-6" />
                </button>
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
                />
             </div>
           </div>
        </div>
      )}

      {/* WELCOME ONBOARDING MODAL */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-4 border-emerald-600 relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-fade-in">
             <div className="bg-gradient-to-r from-green-800 to-emerald-700 text-white p-4 sm:p-5 flex justify-between items-center shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#fff_20px,#fff_40px)] pointer-events-none transform -skew-x-12 scale-150"></div>
                <h2 className="text-lg sm:text-2xl font-black flex items-center gap-3 relative z-10">
                  <img src="/logos/world-cup.svg" className="w-6 h-6 sm:w-8 sm:h-8" alt="" onError={(e) => e.target.style.display='none'} />
                  World Cup Sweepstakes
                </h2>
                <button onClick={handleCloseWelcome} className="text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors relative z-10">
                   <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
             </div>
             <div className="p-4 sm:p-5 space-y-3 text-slate-700 overflow-y-auto">
                <p className="text-base sm:text-lg font-medium leading-relaxed">
                  Welcome to a place to help to keep track of your World Cup Sweepstakes with your Friends, Family, Colleagues, or complete strangers!
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mt-2 space-y-2 sm:space-y-3">
                   <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm border-b border-slate-200 pb-2">How It Works:</h3>
                   <ul className="space-y-2 text-xs sm:text-sm">
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Teams:</strong> Once you have drawn the teams for your sweepstakes make sure to update the Teams section.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>Live Scoring:</strong> You earn points every time your teams win, draw, score goals, or keep a clean sheet. Make sure to check the settings tab to customise your scoring.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Bracket:</strong> As matches finish, the Knockout Bracket automatically populates and routes the winners. However if you notice a mistake feel free to select the correct teams yourself.</span></li>
                     <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" /> <span><strong>The Prizes:</strong> You can track the overall champion, the best kids' squad, and even the dreaded Wooden Spoon!</span></li>
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