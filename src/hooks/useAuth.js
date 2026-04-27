import { useState, useEffect } from 'react';
import {
  onAuthStateChanged, signInAnonymously, GoogleAuthProvider,
  signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase.js';
import { isValidLeagueCode } from '../utils/leagueUtils.js';

const DEFAULT_LEAGUE_NAME = 'My First Sweepstakes';

/**
 * Manages all Firebase authentication and the initial league-selection
 * logic that runs immediately after sign-in.
 *
 * Returns everything App.jsx needs to know about the current user and
 * their league list, plus the auth action handlers.
 */
export const useAuth = ({ setActiveLeagueId, setPendingJoinCode, setShowJoinModal }) => {
  const [user, setUser] = useState(null);
  const [hostedLeagues, setHostedLeagues] = useState([]);
  const [leaguesLoaded, setLeaguesLoaded] = useState(false);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState(null);

  // ─── Auth action handlers ────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    try {
      setAuthMessage({ type: 'info', text: 'Opening Google Login...' });
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthMessage({ type: 'success', text: 'Successfully linked account!' });
      setTimeout(() => { setShowAccountModal(false); setAuthMessage(null); }, 1500);
    } catch (error) {
      const msg =
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-closed-by-user'
          ? 'Sign in was cancelled.'
          : error.message;
      setAuthMessage({ type: 'error', text: msg });
    }
  };

  const handleMagicLink = async () => {
    if (!authEmail) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setAuthMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
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

  // ─── League registry helpers ─────────────────────────────────────────────

  const updateHostedLeagues = async (uid, newList) => {
    setHostedLeagues(newList);
    await setDoc(
      doc(db, 'artifacts', appId, 'users', uid, 'metadata', 'leagues'),
      { list: newList }
    );
  };

  // ─── Auth initialisation & state listener ────────────────────────────────

  useEffect(() => {
    // Step 1: Handle magic link before touching anonymous auth to avoid races
    const initAuth = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        const email = window.localStorage.getItem('emailForSignIn');
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, '', window.location.pathname);
            setShowAccountModal(true);
            setAuthMessage({ type: 'success', text: 'Successfully signed in!' });
            setTimeout(() => { setShowAccountModal(false); setAuthMessage(null); }, 3000);
          } catch (err) {
            console.error('Magic link error:', err);
            window.history.replaceState({}, '', window.location.pathname);
            setShowAccountModal(true);
            setAuthMessage({
              type: 'error',
              text: 'That sign-in link has expired or already been used. Please request a new one.',
            });
            try { await signInAnonymously(auth); } catch (e) { console.error(e); }
          }
        } else {
          // Link opened on a different device — no stored email
          window.history.replaceState({}, '', window.location.pathname);
          setShowAccountModal(true);
          setAuthMessage({
            type: 'error',
            text: 'Please enter your email address to complete sign-in.',
          });
          try { await signInAnonymously(auth); } catch (e) { console.error(e); }
        }
        return;
      }

      // Step 2: Normal load
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch (err) { console.error(err); }
      }
    };

    initAuth();

    // Step 3: React to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLeaguesLoaded(false);

      if (!u) return;

      // Load the user's owned leagues from Firestore
      const registryRef = doc(db, 'artifacts', appId, 'users', u.uid, 'metadata', 'leagues');
      let ownedList = [];
      try {
        const regSnap = await getDoc(registryRef);
        if (regSnap.exists()) {
          ownedList = regSnap.data().list || [];
        } else {
          ownedList = [{ id: u.uid, name: DEFAULT_LEAGUE_NAME }];
          await setDoc(registryRef, { list: ownedList });
        }
      } catch (err) {
        console.error('Failed to load leagues registry:', err);
        ownedList = [{ id: u.uid, name: 'My Sweepstakes' }];
      }

      setHostedLeagues(ownedList);

      // Determine which league to activate
      const urlParams = new URLSearchParams(window.location.search);
      const hostParam = urlParams.get('host');
      const savedLeagueId = (() => { try { return localStorage.getItem('wcActiveLeague'); } catch { return null; } })();
      const currentJoinedLeagues = (() => {
        try { return JSON.parse(localStorage.getItem('wcJoinedLeagues')) || []; } catch { return []; }
      })();

      if (hostParam) {
        if (!isValidLeagueCode(hostParam)) {
          console.warn('Invalid host param in URL, ignoring.');
        } else {
          const isMine = ownedList.some(l => l.id === hostParam);
          const isJoined = currentJoinedLeagues.some(l => l.id === hostParam);
          if (!isMine && !isJoined) {
            setPendingJoinCode(hostParam);
            setShowJoinModal(true);
          } else {
            setActiveLeagueId(hostParam);
            try { localStorage.setItem('wcActiveLeague', hostParam); } catch (e) {}
          }
        }
        window.history.replaceState({}, '', window.location.pathname);
      } else if (savedLeagueId) {
        const isStillMine = ownedList.some(l => l.id === savedLeagueId);
        const isStillJoined = currentJoinedLeagues.some(l => l.id === savedLeagueId);
        if (isStillMine || isStillJoined || savedLeagueId === u.uid) {
          setActiveLeagueId(savedLeagueId);
        } else {
          setActiveLeagueId(u.uid);
          try { localStorage.setItem('wcActiveLeague', u.uid); } catch (e) {}
        }
      } else {
        setActiveLeagueId(u.uid);
        try { localStorage.setItem('wcActiveLeague', u.uid); } catch (e) {}
      }

      // Set leaguesLoaded LAST so isOwner computes correctly on first render
      setLeaguesLoaded(true);
    });

    const emergencyTimeout = setTimeout(() => {}, 5000);
    return () => { unsubscribe(); clearTimeout(emergencyTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    hostedLeagues,
    setHostedLeagues,
    leaguesLoaded,
    updateHostedLeagues,
    showAccountModal,
    setShowAccountModal,
    authEmail,
    setAuthEmail,
    authMessage,
    setAuthMessage,
    handleGoogleLogin,
    handleMagicLink,
    handleLogout,
  };
};
