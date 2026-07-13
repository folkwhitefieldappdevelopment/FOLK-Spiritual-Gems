'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { initializeFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// Persistence lock promise to prevent race conditions on early app writes
let resolvePersistence: () => void;
export const persistenceReady = new Promise<void>((resolve) => {
  resolvePersistence = resolve;
});

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  
  // Use initializeFirestore with long-polling to bypass proxy streaming issues in Firebase Studio
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  
  if (typeof window !== 'undefined') {
    // forceOwnership: true is critical for Capacitor/WebView apps to prevent hangs on reload
    enableIndexedDbPersistence(db, { forceOwnership: true })
      .then(() => {
        console.log('[Firebase] Persistence lock acquired successfully.');
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.error('[Firebase] Persistence Failed: Multiple tabs/instances open. Data will be re-downloaded.');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firebase] Persistence Unsupported: Browser does not support IndexedDB.');
        } else {
          console.warn('[Firebase] Persistence Error:', err.code, err.message);
        }
      })
      .finally(() => {
        // Resolve either way so app doesn't hang if persistence fails
        resolvePersistence();
      });
  } else {
    resolvePersistence();
  }

  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase Init Error:", error);
  configError = error instanceof Error ? error : new Error('Firebase failed to initialize');
  resolvePersistence();
}

/**
 * Utility to race a network request against a timeout, returning a fallback value if the network is too slow.
 * Useful for slow-connection scenarios where stale-but-available local data is better than a hang.
 */
export async function withCacheFallback<T>(
  networkPromise: Promise<T>,
  fallbackValue: T,
  timeoutMs = 6000
): Promise<T> {
  return Promise.race([
    networkPromise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs)),
  ]);
}

export { db, auth, storage, configError };
