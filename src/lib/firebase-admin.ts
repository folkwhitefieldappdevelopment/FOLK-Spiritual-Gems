
'use server';

import * as admin from 'firebase-admin';

// This is the object that will be used to initialize the app.
// It is declared here so that it can be modified based on the environment.
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  try {
    // This is the recommended way to initialize in Google Cloud environments
    // It will automatically use the service account attached to the environment
    // or the credentials provided in the environment variables.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    // If the above fails, it's likely because we're in a deployed environment
    // that doesn't have the SERVICE_ACCOUNT_... variables but has the default
    // application credentials.
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('Firebase admin initialization error', e);
    }
  }
}

export { admin };
