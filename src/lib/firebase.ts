// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your Firebase project console.
// This is a placeholder configuration. Replace it with your own.
// For more info, see: https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyBNPDxhvkC-80BBCkfmo1FI3tVf3xSCkmM",
  authDomain: "personal-data-hub-y5fe0.firebaseapp.com",
  projectId: "personal-data-hub-y5fe0",
  storageBucket: "personal-data-hub-y5fe0.firebasestorage.app",
  messagingSenderId: "377269984088",
  appId: "1:377269984088:web:0ed631cb9a448a2845a32d"
};

// Initialize Firebase
// We check if any apps are already initialized to prevent re-initialization errors.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
