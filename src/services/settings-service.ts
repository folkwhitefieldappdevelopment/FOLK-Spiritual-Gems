
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { AppUser, CustomField } from '@/lib/types';


const defaultContactSources = ['Govinda Temple', 'ITPL', 'HK hill'];
const defaultCallingEvent = "Spiritual Camp - July 2024";

export type EnablerOption = {
  value: string;
  label: string;
};

const ensureSettingsDoc = async () => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const docSnap = await getDoc(settingsDocRef);
    const data = docSnap.data() || {};
    
    let needsUpdate = false;
    const updates: {[key: string]: any} = {};

    if (!docSnap.exists()) {
        needsUpdate = true;
        updates.contactSources = defaultContactSources;
        updates.customPersonFields = [];
        updates.currentCallingEvent = defaultCallingEvent;
    } else {
        if (!data.customPersonFields) {
            needsUpdate = true;
            updates.customPersonFields = [];
        }
        if (!data.currentCallingEvent) {
            needsUpdate = true;
            updates.currentCallingEvent = defaultCallingEvent;
        }
    }
    
    if (needsUpdate) {
        await setDoc(settingsDocRef, updates, { merge: true });
    }
    
    const finalData = { ...data, ...updates };

    return {
        contactSources: finalData.contactSources || defaultContactSources,
        customPersonFields: finalData.customPersonFields || [],
        currentCallingEvent: finalData.currentCallingEvent || defaultCallingEvent,
    };
}

export const getEnablers = async (
  appUser: AppUser | null,
  context: 'filter' | 'assignment' = 'filter'
): Promise<EnablerOption[]> => {
  if (!appUser) return [];

  const usersCollection = collection(db, 'users');

  // Admin sees all Folk Enablers and Folk Guides
  if (appUser.role.includes('Admin')) {
    const allUsersSnapshot = await getDocs(usersCollection);
    const allUsers = allUsersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));

    const guides = allUsers.filter(u => u.role.includes('Folk Guide'));
    const assignees = allUsers.filter(u => u.role.includes('Folk Enabler') || u.role.includes('Folk Guide'));

    const options: EnablerOption[] = assignees.map(assignee => {
      let label = assignee.name;
      if (context === 'filter') {
        let fgCode = 'N/A';
        if (assignee.role.includes('Folk Guide')) {
          fgCode = assignee.fgCode || 'N/A';
        } else if (assignee.reportsTo?.guideId) {
          const guide = guides.find(g => g.id === assignee.reportsTo?.guideId);
          fgCode = guide?.fgCode || 'N/A';
        }
        label = `${assignee.name} (${fgCode})`;
      }
      return {
        value: assignee.name,
        label,
      };
    });

    const uniqueOptions = Array.from(new Map(options.map(item => [item.value, item])).values());
    return uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
  }

  // Folk Guide sees their enablers + themselves
  if (appUser.role.includes('Folk Guide')) {
    const enablersQuery = query(usersCollection, where('reportsTo.guideId', '==', appUser.id));
    const snapshot = await getDocs(enablersQuery);
    const enablerUsers = snapshot.docs.map(doc => doc.data() as AppUser);

    const options: EnablerOption[] = [];

    // Add the guide themselves. Label depends on context.
    const guideLabel = context === 'filter' ? `${appUser.fgCode || 'Guide'} (Unassigned)` : appUser.name;
    options.push({ value: appUser.name, label: guideLabel });

    // Add their enablers
    enablerUsers.forEach(enabler => {
      options.push({ value: enabler.name, label: enabler.name });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  // A Folk Enabler only ever sees themselves.
  if (appUser.role.includes('Folk Enabler')) {
    return [{ value: appUser.name, label: appUser.name }];
  }

  return [];
};

export const getContactSources = async (): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.contactSources;
}

export const addContactSource = async (newSource: string) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const currentSources = (await getDoc(settingsDocRef)).data()?.contactSources || [];
    if (!currentSources.includes(newSource)) {
        const updatedSources = [...currentSources, newSource];
        await setDoc(settingsDocRef, { contactSources: updatedSources }, { merge: true });
        return updatedSources;
    }
    return currentSources;
}

export const updateContactSource = async (oldName: string, newName: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentSources = (await getDoc(settingsDocRef)).data()?.contactSources || [];
    const updatedSources = currentSources.map(s => s === oldName ? newName : s);
    batch.set(settingsDocRef, { contactSources: updatedSources }, { merge: true });

    // 2. Update all people documents
    const peopleQuery = query(collection(db, 'people'), where('contactSource', '==', oldName));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { contactSource: newName });
    });

    await batch.commit();
    return updatedSources;
}

export const deleteContactSource = async (sourceToDelete: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentSources = (await getDoc(settingsDocRef)).data()?.contactSources || [];
    const updatedSources = currentSources.filter(s => s !== sourceToDelete);
    batch.set(settingsDocRef, { contactSources: updatedSources }, { merge: true });

    // 2. Update all people documents
    const peopleQuery = query(collection(db, 'people'), where('contactSource', '==', sourceToDelete));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { contactSource: "" });
    });

    await batch.commit();
    return updatedSources;
}

// Custom Person Fields
export const getCustomPersonFields = async (): Promise<CustomField[]> => {
    const settings = await ensureSettingsDoc();
    // Ensure all fields have a type for backward compatibility
    return settings.customPersonFields.map((f: CustomField) => ({ ...f, type: f.type || 'text' }));
};

export const saveCustomPersonFields = async (fields: CustomField[]): Promise<void> => {
    const settingsDocRef = doc(db, 'settings', 'options');
    await setDoc(settingsDocRef, { customPersonFields: fields }, { merge: true });
};

// Calling Event
export const getCurrentCallingEvent = async (): Promise<string> => {
    const settings = await ensureSettingsDoc();
    return settings.currentCallingEvent;
};

export const updateCurrentCallingEvent = async (eventName: string): Promise<void> => {
    const settingsDocRef = doc(db, 'settings', 'options');
    await setDoc(settingsDocRef, { currentCallingEvent: eventName }, { merge: true });
};
