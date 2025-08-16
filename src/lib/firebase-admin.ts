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
  } catch (error: any) {
    console.error('Firebase admin initialization error', error);
    // Throw a more specific error to help with debugging.
    if (error.code === 'app/duplicate-app') {
        // This can happen in hot-reload scenarios, so we'll just ignore it.
    } else if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        throw new Error('Firebase Admin SDK initialization failed. Required service account environment variables are missing. Please check your `.env.local` file.');
    } else {
        throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
  }
}

export { admin };
