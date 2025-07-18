
'use server';

import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;

try {
  // In a Google Cloud environment like App Hosting, the SDK will automatically
  // find the service account credentials if they are configured correctly.
  // We do not need to manually provide cert() or read from env vars.
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK...');
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  }
  adminAuth = admin.auth();
} catch (error: any) {
  console.error('********************************************************************************');
  console.error('FIREBASE ADMIN SDK INITIALIZATION FAILED:');
  console.error('This usually means the service account credentials are not available in the environment.');
  console.error('Please ensure you have configured the service account credentials in your hosting environment.');
  console.error('User creation and deletion will not work until this is resolved.');
  console.error('Original error:', error.message);
  console.error('********************************************************************************');
  // Set to null to indicate failure, allowing for graceful degradation.
  adminAuth = null;
}

export { adminAuth };
