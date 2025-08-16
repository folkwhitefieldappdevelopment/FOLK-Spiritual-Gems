
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
    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
        // This is the recommended way to initialize in local/CI environments
        // where you can set environment variables for the service account.
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        // This is the recommended way to initialize in Google Cloud environments
        // It will automatically use the service account attached to the environment.
        // If it fails here, it's likely because the service account is not configured correctly.
        console.log("Initializing Firebase Admin with default credentials...");
        admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    throw new Error('Firebase Admin SDK initialization failed. Check your service account credentials and environment setup.');
  }
}

export { admin };
