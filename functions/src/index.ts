import * as admin from 'firebase-admin';
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp();

// Set global options to ensure functions deploy to the correct region
setGlobalOptions({ region: "asia-south1" });

export { goalDeadlineReminders } from './goal-reminders';
export { cleanupExpiredAssignments } from './co-enabler-expiry';

/**
 * Callable function to provision a new user (Auth + Firestore).
 * Ensures UID consistency and email uniqueness.
 */
export const createAppUser = onCall({
  invoker: 'public'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const callerUid = request.auth.uid;
  const db = admin.firestore();
  
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData?.role?.includes("Admin")) {
    throw new HttpsError("permission-denied", "Only administrators can provision new users.");
  }

  const { name, email, phone, password, role, fgCode, guideId } = request.data;

  if (!email || !name || !role || !password) {
    throw new HttpsError("invalid-argument", "Missing required fields: email, name, role, or password.");
  }

  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  try {
    // 1. Create Firebase Auth Account
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      phoneNumber: phone ? `+91${phone.replace(/\D/g, "").slice(-10)}` : undefined,
      displayName: name,
      password: password,
    });

    // 2. Generate Optional Reset Link & Dispatch Welcome Email
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await db.collection("mail").add({
      to: [email],
      message: {
        subject: "Welcome to FOLK Spiritual Gems CRM",
        html: `<div style="font-family: sans-serif; max-width: 600px;">
          <h2>Hare Krishna ${name},</h2>
          <p>An account has been created for you in the FOLK CRM. Your account is now active and ready for use.</p>
          <p>Please log in using the password shared with you by your administrator at: <a href="https://${process.env.GCLOUD_PROJECT}.firebaseapp.com">FOLK CRM Portal</a></p>
          <hr/>
          <p style="font-size: 12px; color: #666;"><b>Security Tip:</b> We recommend changing your password after your first login. If you ever forget your password, you can use the link below to reset it:</p>
          <p><a href="${resetLink}" style="color: #3F51B5; text-decoration: underline;">Reset my password</a></p>
        </div>`,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Create Firestore User Document
    const userData: any = {
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      role: Array.isArray(role) ? role : [role],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (userData.role.includes("Folk Guide") && fgCode) {
      userData.fgCode = fgCode;
    }

    if (userData.role.includes("Folk Enabler") && guideId) {
      const guideDoc = await db.collection("users").doc(guideId).get();
      if (guideDoc.exists()) {
        const g = guideDoc.data();
        userData.reportsTo = {
          guideId: guideDoc.id,
          guideName: g?.name || "Unknown",
          guideFgCode: g?.fgCode || "",
        };
      }
    }

    await db.collection("users").doc(userRecord.uid).set(userData);

    // 4. Log Audit
    await db.collection("audits").add({
      userId: callerUid,
      userName: callerData.name || "Admin",
      action: "Create User",
      details: `Provisioned account and Firestore record for ${name} (${email})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, success: true };
  } catch (error: any) {
    console.error("User Provisioning Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new HttpsError("already-exists", "A user with this email address already exists.");
    }
    throw new HttpsError("internal", error.message || "An unexpected error occurred during provisioning.");
  }
});

/**
 * Callable function to delete a user from both Auth and Firestore.
 */
export const deleteAppUser = onCall({
  invoker: 'public'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const callerUid = request.auth.uid;
  const db = admin.firestore();
  
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData?.role?.includes("Admin")) {
    throw new HttpsError("permission-denied", "Only administrators can terminate accounts.");
  }

  const { targetUid } = request.data;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Target user ID is required.");
  }

  // SELF DELETION GUARD
  if (callerUid === targetUid) {
    throw new HttpsError("failed-precondition", "You cannot delete your own account.");
  }

  try {
    const targetDoc = await db.collection("users").doc(targetUid).get();
    const targetName = targetDoc.data()?.name || targetUid;

    // Remove from Auth (resilient to missing accounts)
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (authError: any) {
      if (authError.code !== 'auth/user-not-found') {
        throw authError; // re-throw unexpected errors
      }
      // no matching Auth account — fine, just proceed to remove the Firestore record
      console.warn(`No Auth account found for ${targetUid}, removing Firestore record only.`);
    }
    
    // Remove from Firestore
    await db.collection("users").doc(targetUid).delete();

    // Log Audit
    await db.collection("audits").add({
      userId: callerUid,
      userName: callerData.name || "Admin",
      action: "Delete User",
      details: `Permanently removed user ${targetName} (UID: ${targetUid})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("User Deletion Error:", error);
    throw new HttpsError("internal", error.message || "Failed to delete user.");
  }
});