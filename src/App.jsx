import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

// --- CONFIG & UTILS ---
import { auth, SUPER_ADMIN_UID } from './config/firebase.js';
import { generateAllMatches } from './config/data.js';
import { calculateStats } from './utils/tournamentLogic.js';

// --- HOOKS ---
import { useAuth } from './hooks/useAuth.js';
import { useLeagues } from './hooks/useLeagues.js';
import { useLeagueData } from './hooks/useLeagueData.js';
import { useEspnSync } from './hooks/useEspnSync.js';
import { useTournamentEngine } from './hooks/useTournamentEngine.js';

// --- LAYOUT ---
import { AppHeader } from './components/layout/AppHeader.jsx';

// --- TABS ---
import { StandingsTab } from './components/tabs/StandingsTab.jsx';
import { GroupsTab } from './components/tabs/GroupsTab.jsx';
import { MatchesTab } from './components/tabs/MatchesTab.jsx';
import { TeamsTab } from './components/tabs/TeamsTab.jsx';
import { BracketTab } from './components/tabs/BracketTab.jsx';

// --- MODALS ---
import { AccountModal } from './components/modals/AccountModal.jsx';
import { WelcomeModal } from './components/modals/WelcomeModal.jsx';
import { LeaveModal } from './components/modals/LeaveModal.jsx';
import { JoinModal } from './components/modals/JoinModal.jsx';
import { SettingsModal } from './components/modals/SettingsModal.jsx';

// --- FANTASY ---
import { useFantasyData } from './fantasy/useFantasyData.js';
import { FantasyDraftModal } from './fantasy/FantasyDraftModal.jsx';
import { FantasyTeamsTab } from './fantasy/FantasyTeamsTab.jsx';
import { FantasyStandingsTab } from './fantasy/FantasyStandingsTab.jsx';
import { getMaxMembers } from './fantasy/fantasyLogic.js';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeLeagueId, setActiveLeagueId] = useState(() => {
    try { return localStorage.getItem('wcActiveLeague') || null; } catch { return null; }
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    try { return localStorage.getItem('hideWorldCupWelcome') !== 'true'; } catch { return true; }
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [localTimezone, setLocalTimezone] = useState(() => {
    try {
      return localStorage.getItem('worldCupTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    } catch { return 'Europe/London'; }
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  // useAuth needs to be able to open the join modal when an invite link is
  // detected — we forward the setters after useLeagues is called, but we need
  // the callbacks defined before calling useAuth, so we use thin forwarders.
  const [pendingJoinCodeFromUrl, setPendingJoinCodeFromUrl] = useState('');
  const [openJoinModalFromUrl, setOpenJoinModalFromUrl] = useState(false);

  const {
    user, hostedLeagues, setHostedLeagues, leaguesLoaded, updateHostedLeagues,
    showAccountModal, setShowAccountModal,
    authEmail, setAuthEmail, authMessage, setAuthMessage,
    handleGoogleLogin, handleMagicLink, handleLogout,
  } = useAuth({
    setActiveLeagueId,
    setPendingJoinCode: setPendingJoinCodeFromUrl,
    setShowJoinModal: setOpenJoinModalFromUrl,
  });

  // ─── Permissions ──────────────────────────────────────────────────────────

  const isOwner = useMemo(() => {
    if (!user || !leaguesLoaded) return false;
    return hostedLeagues.some(l => l.id === activeLeagueId) || activeLeagueId === user.uid;
  }, [user, leaguesLoaded, hostedLeagues, activeLeagueId]);

  const isViewer = !isOwner;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  const isAccountLinked = user && !user.isAnonymous;

  // ─── Leagues ──────────────────────────────────────────────────────────────

  const {
    joinedLeagues,
    showJoinModal, setShowJoinModal,
    showLeaveModal, setShowLeaveModal,
    pendingJoinCode, setPendingJoinCode,
    pendingJoinName, setPendingJoinName,
    joinCodeError, setJoinCodeError,
    handleSwitchLeague, handleCreateLeague, handleJoinSubmit, confirmLeaveLeague,
    handleDeleteHostedLeague,
  } = useLeagues({
    user, hostedLeagues, updateHostedLeagues, activeLeagueId, setActiveLeagueId,
    initialPendingCode: pendingJoinCodeFromUrl,
    initialShowJoin: openJoinModalFromUrl,
  });

  // ─── League data ──────────────────────────────────────────────────────────

  const {
    members, setMembers,
    assignments, setAssignments,
    eliminatedTeams, setEliminatedTeams,
    manualRestores, setManualRestores,
    matches, setMatches,
    settings, setSettings,
    saveState,
    leagueDataReady,
    DEFAULT_6_USERS,
  } = useLeagueData({ user, activeLeagueId, isOwner, isSuperAdmin, setHostedLeagues, setLoading });

  // ─── Fantasy data (only active when settings.fantasyMode is true) ─────────

  const {
    ownership: fantasyOwnership,
    picks: fantasyPicks,
    matchStats: fantasyMatchStats,
    draftMeta: fantasyDraftMeta,
    fantasyDataReady,
    commitDraft: fantasyCommitDraft,
    updatePick: fantasyUpdatePick,
    updateMatchStat: fantasyUpdateMatchStat,
    saveFantasyState: fantasySaveState, 
  } = useFantasyData({
    user,
    activeLeagueId,
    isOwner,
    fantasyMode: !!settings.fantasyMode,
  });

  const [showFantasyDraftModal, setShowFantasyDraftModal] = useState(false);

  // ─── Sync & engine ────────────────────────────────────────────────────────

  useEspnSync(isSuperAdmin, settings, setMatches, saveState);
  useTournamentEngine({
    matches, setMatches,
    teamStats: calculateStats(matches, eliminatedTeams, settings, members, assignments).teamStats,
    eliminatedTeams, setEliminatedTeams,
    manualRestores, settings, isOwner, isSuperAdmin, saveState,
    leagueDataReady,
  });

  // ─── Computed stats ───────────────────────────────────────────────────────

  const { teamStats, memberStats, awards } = useMemo(() => {
    const stats = calculateStats(matches, eliminatedTeams, settings, members, assignments);
    if (stats.awards?.overall) {
      const first = stats.awards.overall['1st']?.id;
      const second = stats.awards.overall['2nd']?.id;
      const third = stats.awards.overall['3rd']?.id;
      if (third && (third === first || third === second)) {
        const sorted = [...stats.memberStats].sort((a, b) => b.pts - a.pts);
        const eligible = sorted.find(m => m.id !== first && m.id !== second);
        if (eligible) stats.awards.overall['3rd'] = eligible;
        else delete stats.awards.overall['3rd'];
      }
    }
    return stats;
  }, [members, assignments, matches, eliminatedTeams, settings]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleMatchUpdate = (matchId, field, value) => {
    if (!isSuperAdmin) return;
    const next = matches.map(m => m.id === matchId ? { ...m, [field]: value } : m);
    setMatches(next);
    saveState('matches', next);
  };

  const handleRandomizeGroups = () => {
    if (!isSuperAdmin) return;
    const next = matches.map(m =>
      m.stage === 'Group'
        ? { ...m, scoreA: Math.floor(Math.random() * 4).toString(), scoreB: Math.floor(Math.random() * 4).toString(), isPlayed: true }
        : m
    );
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
    if (members.length >= 24) return;
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
    Object.keys(nextAssignments).forEach(tid => { if (nextAssignments[tid] === id) delete nextAssignments[tid]; });
    setAssignments(nextAssignments);
    saveState('assignments', nextAssignments);
  };

  const updateSettings = (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveState('settings', next);
  };

  const handleResetData = () => {
  if (isViewer) return;
  // Only reset match scores and eliminations — leave managers,
  // assignments, and settings completely untouched.
  const reset = generateAllMatches();
  setMatches(reset);
  setEliminatedTeams({});
  setManualRestores({});
  saveState('matches', reset);
  saveState('eliminatedTeams', {});
  saveState('manualRestores', {});
  setShowSettingsModal(false);
  };

  const handleHardReset = async () => {
    try { localStorage.clear(); await auth.signOut(); } catch (e) { console.error(e); }
    window.location.href = window.location.origin + window.location.pathname;
  };

  const getOwnerName = (teamId) => {
    const ownerId = assignments[teamId];
    if (!ownerId) return 'Unassigned';
    return members.find(m => m.id === ownerId)?.name || 'Unassigned';
  };

  const handleCloseWelcome = () => {
    if (dontShowAgain) { try { localStorage.setItem('hideWorldCupWelcome', 'true'); } catch (e) {} }
    setShowWelcomeModal(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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

      <AppHeader
        isViewer={isViewer}
        isOwner={isOwner}
        isAccountLinked={isAccountLinked}
        user={user}
        activeLeagueId={activeLeagueId}
        hostedLeagues={hostedLeagues}
        joinedLeagues={joinedLeagues}
        onSwitchLeague={handleSwitchLeague}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenLeave={() => setShowLeaveModal(true)}
        onOpenJoin={() => setShowJoinModal(true)}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenHelp={() => setShowWelcomeModal(true)}
      />

      {/* Two-tier tab bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-20">
        <div className="bg-white rounded-xl shadow-lg border-2 border-green-100/50 p-1.5 sm:p-2 flex flex-col gap-1.5">
          {/* Top row: Groups · Knockout · Matches */}
          <div className="flex gap-1.5 sm:gap-2">
            {['groups', 'bracket', 'matches'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {tab === 'bracket' ? 'Knockout' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {/* Bottom row: Standings · Teams */}
          <div className="flex gap-1.5 sm:gap-2">
            {['standings', 'teams'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {activeTab === 'standings' && (
          settings.fantasyMode ? (
            <FantasyStandingsTab
              members={members}
              matches={matches}
              picks={fantasyPicks}
              matchStats={fantasyMatchStats}
              draftMeta={fantasyDraftMeta}
              picksPerCategory={settings.fantasyPicksPerCategory || 5}
            />
          ) : (
            <StandingsTab settings={settings} awards={awards} memberStats={memberStats} />
          )
        )}
        {activeTab === 'groups'   && <GroupsTab teamStats={teamStats} matches={matches} settings={settings} />}
        {activeTab === 'bracket'  && <BracketTab matches={matches} members={members} assignments={assignments} />}
        {activeTab === 'matches'  && (
          <MatchesTab
            matches={matches}
            localTimezone={localTimezone}
            setLocalTimezone={setLocalTimezone}
            isViewer={!isSuperAdmin}
            handleMatchUpdate={handleMatchUpdate}
            getOwnerName={getOwnerName}
            eliminatedTeams={eliminatedTeams}
            handleRandomizeGroups={handleRandomizeGroups}
            fantasyMode={!!settings.fantasyMode}
            fantasyMatchStats={fantasyMatchStats}
            fantasyUpdateMatchStat={fantasyUpdateMatchStat}
            isFantasyViewer={!isOwner}
          />
        )}
        {activeTab === 'teams' && (
          settings.fantasyMode ? (
            <FantasyTeamsTab
              isViewer={isViewer}
              isOwner={isOwner}
              members={members}
              ownership={fantasyOwnership}
              picks={fantasyPicks}
              draftMeta={fantasyDraftMeta}
              picksPerCategory={settings.fantasyPicksPerCategory || 5}
              fantasyUpdatePick={fantasyUpdatePick}
              saveFantasyState={fantasySaveState}
              onOpenDraft={() => setShowFantasyDraftModal(true)}
            />
          ) : (
            <TeamsTab
              eliminatedTeams={eliminatedTeams}
              isViewer={isViewer}
              assignments={assignments}
              members={members}
              handleAssign={handleAssign}
              toggleEliminated={toggleEliminated}
            />
          )
        )}
      </main>

      {/* Modals */}
      {showLeaveModal && <LeaveModal onConfirm={confirmLeaveLeague} onCancel={() => setShowLeaveModal(false)} />}
      {showJoinModal && (
        <JoinModal
          pendingJoinCode={pendingJoinCode} setPendingJoinCode={setPendingJoinCode}
          pendingJoinName={pendingJoinName} setPendingJoinName={setPendingJoinName}
          joinCodeError={joinCodeError} setJoinCodeError={setJoinCodeError}
          onJoinSubmit={handleJoinSubmit}
          onCreateLeague={handleCreateLeague}
          onDeleteHostedLeague={handleDeleteHostedLeague}
          hostedLeagues={hostedLeagues}
          activeLeagueId={activeLeagueId}
          user={user}
          onClose={() => { setShowJoinModal(false); setJoinCodeError(''); }}
        />
      )}
      {showSettingsModal && isOwner && (
        <SettingsModal
          settings={settings} updateSettings={updateSettings}
          members={members}
          handleAddMember={handleAddMember}
          handleUpdateMember={handleUpdateMember}
          handleDeleteMember={handleDeleteMember}
          handleResetData={handleResetData}
          handleHardReset={handleHardReset}
          userUid={activeLeagueId}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
      {showFantasyDraftModal && isOwner && settings.fantasyMode && (
        <FantasyDraftModal
          members={members}
          ownership={fantasyOwnership}
          draftMeta={fantasyDraftMeta}
          picksPerCategory={settings.fantasyPicksPerCategory || 5}
          commitDraft={fantasyCommitDraft}
          onClose={() => setShowFantasyDraftModal(false)}
        />
      )}
      {showWelcomeModal && <WelcomeModal dontShowAgain={dontShowAgain} setDontShowAgain={setDontShowAgain} handleCloseWelcome={handleCloseWelcome} />}
      {showAccountModal && (
        <AccountModal
          user={user} isAccountLinked={isAccountLinked}
          authEmail={authEmail} setAuthEmail={setAuthEmail}
          authMessage={authMessage} setAuthMessage={setAuthMessage}
          setShowAccountModal={setShowAccountModal}
          handleGoogleLogin={handleGoogleLogin}
          handleMagicLink={handleMagicLink}
          handleLogout={handleLogout}
        />
      )}
    </div>
  );
}
