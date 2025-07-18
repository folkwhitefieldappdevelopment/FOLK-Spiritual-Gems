
import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;

// This function attempts to initialize the Firebase Admin SDK.
// It's designed to run in a server environment.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    // In a Google Cloud environment like App Hosting, if the service account
    // is configured correctly (e.g., via GOOGLE_APPLICATION_CREDENTIALS),
    // the SDK will initialize without any arguments.
    console.log("Attempting to initialize Firebase Admin SDK...");
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error('***********************************************************************');
    console.error('FIREBASE ADMIN SDK INITIALIZATION FAILED:');
    console.error('This usually means the service account credentials are not available.');
    console.error('Please ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly in your environment.');
    console.error('User creation and deletion will be disabled until this is resolved.');
    console.error('Original error:', error.message);
    console.error('***********************************************************************');
    // We do not throw an error here to allow the app to run in a degraded state.
    // The functions using adminAuth will handle the uninitialized state.
  }
};

initializeFirebaseAdmin();

// We assign the auth instance after initialization.
// If initialization failed, accessing admin.auth() would throw.
// Instead, we check if an app has been initialized.
if (admin.apps.length > 0) {
  adminAuth = admin.auth();
} else {
  // @ts-ignore
  adminAuth = null; // Explicitly set to null if initialization fails.
}


export { adminAuth };
