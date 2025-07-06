import admin from 'firebase-admin';

// In App Hosting, the SDK is automatically initialized with the correct project credentials.
// For other environments, you would need to provide service account credentials.
// This check prevents re-initialization during hot-reloads in development.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const adminAuth = admin.auth();
