

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
import type { AppUser, CustomField, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

const defaultContactSources = ['Govinda Temple', 'ITPL', 'HK hill'];
const defaultOccupationStatuses = ['Working', 'Student', 'Searching for job'];
const defaultStayingWithOptions = ['PG / Hostel', 'Flat', 'Family'];

export type EnablerOption = {
  value: string;
  label: string;
};

const ensureSettingsDoc = async (userInfo: UserInfo) => {
    if (!userInfo) {
        throw new Error("Authentication required to access settings.");
    }
    const settingsDocRef = doc(db, 'settings', 'options');
    const docSnap = await getDoc(settingsDocRef);
    const data = docSnap.data() || {};
    
    let needsUpdate = false;
    const updates: {[key: string]: any} = {};

    if (!docSnap.exists() || !data.contactSources) {
        updates.contactSources = defaultContactSources;
        needsUpdate = true;
    }
    if (!docSnap.exists() || !data.occupationStatuses) {
        updates.occupationStatuses = defaultOccupationStatuses;
        needsUpdate = true;
    }
    if (!docSnap.exists() || !data.stayingWithOptions) {
        updates.stayingWithOptions = defaultStayingWithOptions;
        needsUpdate = true;
    }
    if (!docSnap.exists() || !data.customPersonFields) {
        updates.customPersonFields = [];
        needsUpdate = true;
    }
    if (!docSnap.exists() || !data.whatsAppTemplate) {
        updates.whatsAppTemplate = "Hare Krishna {name}, ...";
        needsUpdate = true;
    }
    
    if (needsUpdate) {
        await setDoc(settingsDocRef, updates, { merge: true });
    }
    
    const finalData = { ...data, ...updates };

    return {
        contactSources: finalData.contactSources,
        occupationStatuses: finalData.occupationStatuses,
        stayingWithOptions: finalData.stayingWithOptions,
        customPersonFields: finalData.customPersonFields,
        whatsAppTemplate: finalData.whatsAppTemplate,
    };
}

export const getEnablers = async (
  userInfo: UserInfo | null,
  context: 'filter' | 'assignment' = 'filter'
): Promise<EnablerOption[]> => {
  if (!userInfo) return [];

  const usersCollection = collection(db, 'users');
  const allUsersSnapshot = await getDocs(usersCollection);
  const allUsers = allUsersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));

  const assignees = allUsers.filter(u => (u.role || []).includes('Folk Enabler') || (u.role || []).includes('Folk Guide'));

  const options: EnablerOption[] = assignees.map(assignee => ({
    value: assignee.name,
    label: assignee.name,
  }));
  
  if (context === 'filter') {
      options.unshift({ value: '__UNASSIGNED__', label: 'Unassigned' });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
};

export const getContactSources = async (userInfo: UserInfo): Promise<string[]> => {
    const settings = await ensureSettingsDoc(userInfo);
    return settings.contactSources.sort((a:string, b:string) => a.localeCompare(b));
}

export const addContactSource = async (newSource: string, userInfo: UserInfo) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentSources = settings.contactSources;
    if (!currentSources.includes(newSource)) {
        const updatedSources = [...currentSources, newSource];
        await setDoc(settingsDocRef, { contactSources: updatedSources }, { merge: true });
        await logAudit('Add Contact Source', `Added source: ${newSource}`, userInfo);
        return updatedSources;
    }
    return currentSources;
}

export const updateContactSource = async (oldName: string, newName: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    const settings = await ensureSettingsDoc(userInfo);
    const currentSources = settings.contactSources;
    const updatedSources = currentSources.map((s:string) => s === oldName ? newName : s);
    batch.set(settingsDocRef, { contactSources: updatedSources }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('contactSource', '==', oldName));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { contactSource: newName });
    });

    await batch.commit();
    await logAudit('Update Contact Source', `Renamed source from "${oldName}" to "${newName}"`, userInfo);
    return updatedSources;
}

export const deleteContactSource = async (sourceToDelete: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    const settings = await ensureSettingsDoc(userInfo);
    const currentSources = settings.contactSources;
    const updatedSources = currentSources.filter((s:string) => s !== sourceToDelete);
    batch.set(settingsDocRef, { contactSources: updatedSources }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('contactSource', '==', sourceToDelete));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { contactSource: "" });
    });

    await batch.commit();
    await logAudit('Delete Contact Source', `Deleted source: ${sourceToDelete}`, userInfo);
    return updatedSources;
}

// Occupation Statuses
export const getOccupationStatuses = async (userInfo: UserInfo): Promise<string[]> => {
    const settings = await ensureSettingsDoc(userInfo);
    return settings.occupationStatuses.sort((a:string, b:string) => a.localeCompare(b));
};

export const addOccupationStatus = async (newStatus: string, userInfo: UserInfo) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentStatuses = settings.occupationStatuses;
    if (!currentStatuses.includes(newStatus)) {
        const updatedStatuses = [...currentStatuses, newStatus];
        await setDoc(settingsDocRef, { occupationStatuses: updatedStatuses }, { merge: true });
        await logAudit('Add Occupation Status', `Added status: ${newStatus}`, userInfo);
        return updatedStatuses;
    }
    return currentStatuses;
};

export const updateOccupationStatus = async (oldName: string, newName: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentStatuses = settings.occupationStatuses;
    const updatedStatuses = currentStatuses.map((s:string) => s === oldName ? newName : s);
    batch.set(settingsDocRef, { occupationStatuses: updatedStatuses }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('occupation', '==', oldName));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { occupation: newName });
    });

    await batch.commit();
    await logAudit('Update Occupation Status', `Renamed status from "${oldName}" to "${newName}"`, userInfo);
    return updatedStatuses;
};

export const deleteOccupationStatus = async (statusToDelete: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentStatuses = settings.occupationStatuses;
    const updatedStatuses = currentStatuses.filter((s:string) => s !== statusToDelete);
    batch.set(settingsDocRef, { occupationStatuses: updatedStatuses }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('occupation', '==', statusToDelete));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { occupation: "" });
    });

    await batch.commit();
    await logAudit('Delete Occupation Status', `Deleted status: ${statusToDelete}`, userInfo);
    return updatedStatuses;
};


// Staying With Options
export const getStayingWithOptions = async (userInfo: UserInfo): Promise<string[]> => {
    const settings = await ensureSettingsDoc(userInfo);
    return settings.stayingWithOptions.sort((a:string, b:string) => a.localeCompare(b));
};

export const addStayingWithOption = async (newOption: string, userInfo: UserInfo) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentOptions = settings.stayingWithOptions;
    if (!currentOptions.includes(newOption)) {
        const updatedOptions = [...currentOptions, newOption];
        await setDoc(settingsDocRef, { stayingWithOptions: updatedOptions }, { merge: true });
        await logAudit('Add Staying With Option', `Added option: ${newOption}`, userInfo);
        return updatedOptions;
    }
    return currentOptions;
};

export const updateStayingWithOption = async (oldName: string, newName: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentOptions = settings.stayingWithOptions;
    const updatedOptions = currentOptions.map((s:string) => s === oldName ? newName : s);
    batch.set(settingsDocRef, { stayingWithOptions: updatedOptions }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('stayingWith', '==', oldName));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { stayingWith: newName });
    });

    await batch.commit();
    await logAudit('Update Staying With Option', `Renamed option from "${oldName}" to "${newName}"`, userInfo);
    return updatedOptions;
};

export const deleteStayingWithOption = async (optionToDelete: string, userInfo: UserInfo) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc(userInfo);
    const currentOptions = settings.stayingWithOptions;
    const updatedOptions = currentOptions.filter((s:string) => s !== optionToDelete);
    batch.set(settingsDocRef, { stayingWithOptions: updatedOptions }, { merge: true });

    const peopleQuery = query(collection(db, 'people'), where('stayingWith', '==', optionToDelete));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { stayingWith: "" });
    });

    await batch.commit();
    await logAudit('Delete Staying With Option', `Deleted option: ${optionToDelete}`, userInfo);
    return updatedOptions;
};

// Custom Person Fields
export const getCustomPersonFields = async (userInfo: UserInfo): Promise<CustomField[]> => {
    const settings = await ensureSettingsDoc(userInfo);
    // Ensure all fields have a type and an id for backward compatibility
    return (settings.customPersonFields || []).map((f: any, index: number) => ({ 
        ...f, 
        id: f.id || `custom_${index}`,
        type: f.type || 'text',
        options: f.options || [],
    }));
};

export const saveCustomPersonFields = async (fields: CustomField[], userInfo: UserInfo): Promise<void> => {
    if (!userInfo) throw new Error("Authentication required.");
    const settingsDocRef = doc(db, 'settings', 'options');
    await setDoc(settingsDocRef, { customPersonFields: fields }, { merge: true });
    await logAudit('Update Custom Fields', `Updated custom fields definition.`, userInfo);
};

// WhatsApp Template
export const getWhatsAppTemplate = async (userInfo: UserInfo): Promise<string> => {
    const settings = await ensureSettingsDoc(userInfo);
    return settings.whatsAppTemplate;
}

export const saveWhatsAppTemplate = async (template: string, userInfo: UserInfo): Promise<void> => {
    if (!userInfo) throw new Error("Authentication required.");
    const settingsDocRef = doc(db, 'settings', 'options');
    await setDoc(settingsDocRef, { whatsAppTemplate: template }, { merge: true });
    await logAudit('Update WhatsApp Template', `Updated WhatsApp message template.`, userInfo);
}
