
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // This is the recommended way to initialize in Google Cloud environments
    // It will automatically use the service account attached to the environment
    admin.initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export { admin };
