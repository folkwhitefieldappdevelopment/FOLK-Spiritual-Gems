import * as admin from 'firebase-admin';

admin.initializeApp();

export { goalDeadlineReminders } from './goal-reminders';
export { cleanupExpiredAssignments } from './co-enabler-expiry';
