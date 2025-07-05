
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// Your web app's Firebase configuration is read from environment variables.
// You need to create a .env.local file in the root of your project
// and add your Firebase project's credentials there.
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


// We wrap the initialization in a try/catch to handle config errors gracefully.
// This prevents the app from crashing on startup if the .env.local file is missing or incorrect.
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let googleProvider: GoogleAuthProvider;
let configError: Error | null = null;

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing or incomplete. Please check your .env.local file.");
  }
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
} catch (error) {
  console.error("Firebase Initialization Error:", error);
  if (error instanceof Error) {
    configError = error;
  } else {
    configError = new Error('An unknown error occurred during Firebase initialization.');
  }
}

// Using ts-ignore to suppress errors about variables being used before assignment.
// The configError check in AuthProvider will prevent this from happening at runtime.
// @ts-ignore
export { db, auth, googleProvider, configError };
