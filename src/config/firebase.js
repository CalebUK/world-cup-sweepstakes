import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlsf3Sw7UfufRhSeqJa0TTcRm0sbtKsKU",
  authDomain: "world-cup-sweepstakes-db50a.firebaseapp.com",
  projectId: "world-cup-sweepstakes-db50a",
  storageBucket: "world-cup-sweepstakes-db50a.firebasestorage.app",
  messagingSenderId: "788152604877",
  appId: "1:788152604877:web:b67b3f7763b136cfc07184",
  measurementId: "G-5B5K2VB1VE"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'world-cup-family-2026';