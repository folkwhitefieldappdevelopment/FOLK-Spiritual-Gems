'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAOff0MOvegV57xgv2Y1yvaa7I8ijRHhfQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "spiritual-gemv1-39818720-c204b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spiritual-gemv1-39818720-c204b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "spiritual-gemv1-39818720-c204b.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1032880923980",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1032880923980:web:2459f3aa48a8f4034bdbe9"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let configError: Error | null = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  
  if (typeof window !== 'undefined') {
    // forceOwnership: true is critical for Capacitor/WebView apps to prevent hangs on reload
    enableIndexedDbPersistence(db, { forceOwnership: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistence failed: Browser not supported.');
      } else {
        console.warn('Persistence error:', err.code, err.message);
      }
    });
  }

  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase Init Error:", error);
  configError = error instanceof Error ? error : new Error('Firebase failed to initialize');
}

export { db, auth, storage, configError };