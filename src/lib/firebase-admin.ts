
'use server';

import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;

try {
  // In a Google Cloud environment like App Hosting, if the service account
  // (or GOOGLE_APPLICATION_CREDENTIALS) is configured, the SDK will initialize
  // without any arguments.
  if (!admin.apps.length) {
    admin.initializeApp();
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
