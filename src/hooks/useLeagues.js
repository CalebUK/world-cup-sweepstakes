import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase.js';
import { isValidLeagueCode } from '../utils/leagueUtils.js';

/**
 * Manages the user's list of joined/hosted leagues and all actions on them:
 * joining, leaving, creating, and switching.
 */
export const useLeagues = ({
  user,
  hostedLeagues,
  updateHostedLeagues,
  activeLeagueId,
  setActiveLeagueId,
}) => {
  const [joinedLeagues, setJoinedLeagues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wcJoinedLeagues')) || []; } catch { return []; }
  });

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState('');
  const [pendingJoinName, setPendingJoinName] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');

  const handleSwitchLeague = (id) => {
    setActiveLeagueId(id);
    try { localStorage.setItem('wcActiveLeague', id); } catch (e) {}
  };

  const handleCreateLeague = async () => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newName = `New League ${hostedLeagues.length + 1}`;
    const newList = [...hostedLeagues, { id: newId, name: newName }];
    await updateHostedLeagues(user.uid, newList);
    handleSwitchLeague(newId);
    setShowJoinModal(false);
  };

  const handleJoinSubmit = () => {
    setJoinCodeError('');
    if (!pendingJoinCode.trim() || !pendingJoinName.trim()) return;

    let finalCode = pendingJoinCode.trim();
    if (finalCode.includes('?host=') || finalCode.startsWith('http')) {
      try {
        finalCode = new URL(finalCode).searchParams.get('host') || finalCode;
      } catch (e) { /* not a URL, use as-is */ }
    }

    if (!isValidLeagueCode(finalCode)) {
      setJoinCodeError("That doesn't look like a valid invite code. Please check the link and try again.");
      return;
    }

    if (!joinedLeagues.find(l => l.id === finalCode)) {
      const newLeagues = [...joinedLeagues, { id: finalCode, name: pendingJoinName.trim() }];
      try { localStorage.setItem('wcJoinedLeagues', JSON.stringify(newLeagues)); } catch (e) {}
      setJoinedLeagues(newLeagues);
    }

    handleSwitchLeague(finalCode);
    setPendingJoinCode('');
    setPendingJoinName('');
    setJoinCodeError('');
    setShowJoinModal(false);
  };

  const handleDeleteHostedLeague = async (leagueId) => {
    if (!user || !leagueId) return;
    // Never delete the user's primary league (their own UID)
    if (leagueId === user.uid) return;
    const newList = hostedLeagues.filter(l => l.id !== leagueId);
    await updateHostedLeagues(user.uid, newList);
    // If we just deleted the active league, switch to the first remaining one
    if (activeLeagueId === leagueId) {
      const fallback = newList[0]?.id || user.uid;
      handleSwitchLeague(fallback);
    }
  };

  const confirmLeaveLeague = () => {
    if (!activeLeagueId) return;
    const newLeagues = joinedLeagues.filter(l => l.id !== activeLeagueId);
    setJoinedLeagues(newLeagues);
    try { localStorage.setItem('wcJoinedLeagues', JSON.stringify(newLeagues)); } catch (e) {}
    if (hostedLeagues.length > 0) handleSwitchLeague(hostedLeagues[0].id);
    setShowLeaveModal(false);
  };

  return {
    joinedLeagues,
    showJoinModal,
    setShowJoinModal,
    showLeaveModal,
    setShowLeaveModal,
    pendingJoinCode,
    setPendingJoinCode,
    pendingJoinName,
    setPendingJoinName,
    joinCodeError,
    setJoinCodeError,
    handleSwitchLeague,
    handleCreateLeague,
    handleJoinSubmit,
    confirmLeaveLeague,
    handleDeleteHostedLeague,
  };
};
