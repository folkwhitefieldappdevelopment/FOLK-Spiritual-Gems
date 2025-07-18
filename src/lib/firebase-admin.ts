import admin from 'firebase-admin';

// In App Hosting, the SDK is automatically initialized with the correct project credentials.
// The check for `admin.apps.length` is important to prevent re-initialization during
// hot-reloads in local development environments.
if (!admin.apps.length) {
  admin.initializeApp({
      credential: admin.credential.applicationDefault(),
  });
}

export const adminAuth = admin.auth();
