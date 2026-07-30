import * as admin from 'firebase-admin';
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

export { goalDeadlineReminders } from './goal-reminders';
export { cleanupExpiredAssignments } from './co-enabler-expiry';

/**
 * Callable function to provision a new user (Auth + Firestore).
 * Ensures UID consistency and email uniqueness.
 */
export const createAppUser = onCall(async (request) => {
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

  const { name, email, phone, role, fgCode, guideId } = request.data;

  if (!email || !name || !role) {
    throw new HttpsError("invalid-argument", "Missing required fields: email, name, or role.");
  }

  try {
    // 1. Create Firebase Auth Account
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      phoneNumber: phone ? `+91${phone.replace(/\D/g, "").slice(-10)}` : undefined,
      displayName: name,
      password: Math.random().toString(36).slice(-12) + "A1!", // Random temporary password
    });

    // 2. Generate Password Reset Link & Dispatch Email
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await db.collection("mail").add({
      to: [email],
      message: {
        subject: "Welcome to FOLK Spiritual Gems CRM",
        html: `<div style="font-family: sans-serif; max-width: 600px;">
          <h2>Hare Krishna ${name},</h2>
          <p>An account has been created for you in the FOLK CRM. To begin managing your outreach, please set your password using the link below:</p>
          <p><a href="${resetLink}" style="background: #3F51B5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Set My Password</a></p>
          <p>After setting your password, you can sign in at: <a href="https://${process.env.GCLOUD_PROJECT}.firebaseapp.com">FOLK CRM Portal</a></p>
          <hr/>
          <p style="font-size: 11px; color: #666;">If the button doesn't work, copy and paste this URL: ${resetLink}</p>
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
export const deleteAppUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerUid = request.auth.uid;
  const db = admin.firestore();
  
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData?.role?.includes("Admin")) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const { targetUid } = request.data;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Target user ID is required.");
  }

  try {
    const targetDoc = await db.collection("users").doc(targetUid).get();
    const targetName = targetDoc.data()?.name || targetUid;

    // Remove from Auth
    await admin.auth().deleteUser(targetUid);
    
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
