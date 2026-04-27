import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Explicitly persist the auth session in localStorage so it survives
// hard refreshes and browser restarts. Without this, email-link sessions
// can silently drop on refresh.
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error('Failed to set auth persistence:', err);
});

export const appId = 'world-cup-family-2026';

// Super admin UID — set in .env (never hardcode in source)
export const SUPER_ADMIN_UID = import.meta.env.VITE_SUPER_ADMIN_UID || '';
