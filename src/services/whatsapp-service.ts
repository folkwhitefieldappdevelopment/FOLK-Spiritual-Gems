'use client';

import { db, persistenceReady } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import type { SavedWhatsappQuestion } from '@/lib/types';

/**
 * Fetches the most frequently used and recent WhatsApp template questions.
 */
export async function getSavedQuestions(): Promise<SavedWhatsappQuestion[]> {
  await persistenceReady;
  const q = query(
    collection(db!, 'savedWhatsappQuestions'),
    orderBy('usageCount', 'desc'),
    orderBy('lastUsedAt', 'desc'),
    limit(20)
  );
  
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedWhatsappQuestion));
  } catch (e) {
    console.error("Failed to fetch questions", e);
    return [];
  }
}

/**
 * Increments the usage count of a question or creates it if new.
 */
export async function upsertQuestion(text: string, userId: string) {
  if (!text.trim()) return;
  await persistenceReady;
  
  // Use a hash-like ID based on text for unique storage
  const id = text.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100);
  const docRef = doc(db!, 'savedWhatsappQuestions', id);
  
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        usageCount: increment(1),
        lastUsedAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        text: text.trim(),
        usageCount: 1,
        lastUsedAt: serverTimestamp(),
        createdBy: userId
      });
    }
  } catch (e) {
    console.warn("Failed to upsert question", e);
  }
}

/**
 * Generates the wa.me link for a specific enabler and message.
 */
export function generateWhatsappLink(phone: string, message: string): string {
  // Strip non-digits and ensure country code
  const cleanPhone = phone.replace(/\D/g, '');
  const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}
