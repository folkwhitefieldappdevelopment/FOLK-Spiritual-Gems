import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Modular Firebase Admin initialization.
 * Safe for use in Next.js Server Actions and API Routes.
 */

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spiritual-gemv1-39818720-c204b";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function initializeAdmin(): App | null {
  // Check if any app is already initialized
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // If credentials are missing, we can't initialize
  if (!clientEmail || !privateKey) {
    return null;
  }

  try {
    // Clean up the private key for resilient parsing
    let formattedKey = privateKey;
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.substring(1, formattedKey.length - 1);
    }
    // Replace escaped newlines with actual newline characters
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
    return null;
  }
}

// Initialize the singleton instance
const app = initializeAdmin();

/**
 * Returns the Auth service if initialized, otherwise throws a descriptive error.
 */
export const getAdminAuth = () => {
  if (!app) {
    throw new Error("Firebase Admin SDK is not properly initialized. Check your environment variables (FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY).");
  }
  return getAuth(app);
};

/**
 * Returns the Firestore service if initialized, otherwise throws a descriptive error.
 */
export const getAdminDb = () => {
  if (!app) {
    throw new Error("Firebase Admin SDK is not properly initialized. Check your environment variables.");
  }
  return getFirestore(app);
};
