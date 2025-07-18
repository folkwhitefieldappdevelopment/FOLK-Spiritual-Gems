import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;

try {
  if (!admin.apps.length) {
    console.log('Initializing Firebase Admin SDK...');
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('Firebase Admin SDK environment variables are not set. User management will be disabled.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines from environment variable
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  }
  adminAuth = admin.auth();
} catch (error: any) {
  console.error('********************************************************************************');
  console.error('FIREBASE ADMIN SDK INITIALIZATION FAILED:');
  console.error('This is likely due to missing or malformed environment variables.');
  console.error('User creation and deletion from the UI will not work until this is resolved.');
  console.error('For a more reliable setup, consider using a service account JSON file.');
  console.error('Original error:', error.message);
  console.error('********************************************************************************');
  // @ts-ignore
  adminAuth = null; // Set to null to indicate failure
}

export { adminAuth };
