
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import type { AppUser, CustomField, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';

const defaultContactSources = ['Govinda Temple', 'ITPL', 'HK hill'];
const defaultOccupationStatuses = ['Working', 'Student', 'Searching for job'];
const defaultStayingWithOptions = ['PG / Hostel', 'Flat', 'Family'];

export type EnablerOption = {
  value: string;
  label: string;
};

const ensureSettingsDoc = async () => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const docSnap = await getDoc(settingsDocRef);
    const data = docSnap.data() || {};
    
    let needsUpdate = false;
    const updates: {[key:string]: any} = {};

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
    if (!docSnap.exists() || typeof data.whatsAppTemplate === 'undefined') {
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
  userInfo: AppUser,
  context: 'filter' | 'assignment' = 'filter'
): Promise<EnablerOption[]> => {
  const usersRef = collection(db, 'users');
  let q;

  if (userInfo.role.includes('Admin')) {
    q = query(usersRef);
  } else if (userInfo.role.includes('Folk Guide')) {
    q = query(usersRef, where('reportsTo.guideId', '==', userInfo.id));
  } else { // Folk Enabler
    q = query(usersRef, where('__name__', '==', userInfo.id)); // Query only for the current user
  }

  const snapshot = await getDocs(q);
  let assignees: AppUser[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));

  if (userInfo.role.includes('Folk Guide')) {
    assignees.push(userInfo);
  }

  const options: EnablerOption[] = assignees.map(assignee => ({
    value: assignee.name,
    label: assignee.name,
  }));
  
  if (context === 'filter') {
      options.unshift({ value: '__UNASSIGNED__', label: 'Unassigned' });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
};

export const getContactSources = async (userInfo?: AppUser): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.contactSources.sort((a:string, b:string) => a.localeCompare(b));
}

export const addContactSource = async (newSource: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentSources = settings.contactSources;
    if (!currentSources.includes(newSource)) {
        const updatedSources = [...currentSources, newSource];
        await updateDoc(settingsDocRef, { contactSources: updatedSources });
        await logAudit('Add Contact Source', `Added source: ${newSource}`, userInfo);
        return updatedSources;
    }
    return currentSources;
}

export const updateContactSource = async (oldName: string, newName: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentSources = settings.contactSources;
    const updatedSources = currentSources.map((s:string) => s === oldName ? newName : s);
    await updateDoc(settingsDocRef, { contactSources: updatedSources });
    await logAudit('Update Contact Source', `Renamed source from "${oldName}" to "${newName}"`, userInfo);
    return updatedSources;
}

export const deleteContactSource = async (sourceToDelete: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentSources = settings.contactSources;
    const updatedSources = currentSources.filter((s:string) => s !== sourceToDelete);
    await updateDoc(settingsDocRef, { contactSources: updatedSources });
    await logAudit('Delete Contact Source', `Deleted source: ${sourceToDelete}`, userInfo);
    return updatedSources;
}

// Occupation Statuses
export const getOccupationStatuses = async (userInfo?: AppUser): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.occupationStatuses.sort((a:string, b:string) => a.localeCompare(b));
};

export const addOccupationStatus = async (newStatus: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentStatuses = settings.occupationStatuses;
    if (!currentStatuses.includes(newStatus)) {
        const updatedStatuses = [...currentStatuses, newStatus];
        await updateDoc(settingsDocRef, { occupationStatuses: updatedStatuses });
        await logAudit('Add Occupation Status', `Added status: ${newStatus}`, userInfo);
        return updatedStatuses;
    }
    return currentStatuses;
};

export const updateOccupationStatus = async (oldName: string, newName: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentStatuses = settings.occupationStatuses;
    const updatedStatuses = currentStatuses.map((s:string) => s === oldName ? newName : s);
    await updateDoc(settingsDocRef, { occupationStatuses: updatedStatuses });
    await logAudit('Update Occupation Status', `Renamed status from "${oldName}" to "${newName}"`, userInfo);
    return updatedStatuses;
};

export const deleteOccupationStatus = async (statusToDelete: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentStatuses = settings.occupationStatuses;
    const updatedStatuses = currentStatuses.filter((s:string) => s !== statusToDelete);
    await updateDoc(settingsDocRef, { occupationStatuses: updatedStatuses });
    await logAudit('Delete Occupation Status', `Deleted status: ${statusToDelete}`, userInfo);
    return updatedStatuses;
};


// Staying With Options
export const getStayingWithOptions = async (userInfo?: AppUser): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.stayingWithOptions.sort((a:string, b:string) => a.localeCompare(b));
};

export const addStayingWithOption = async (newOption: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentOptions = settings.stayingWithOptions;
    if (!currentOptions.includes(newOption)) {
        const updatedOptions = [...currentOptions, newOption];
        await updateDoc(settingsDocRef, { stayingWithOptions: updatedOptions });
        await logAudit('Add Staying With Option', `Added option: ${newOption}`, userInfo);
        return updatedOptions;
    }
    return currentOptions;
};

export const updateStayingWithOption = async (oldName: string, newName: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentOptions = settings.stayingWithOptions;
    const updatedOptions = currentOptions.map((s:string) => s === oldName ? newName : s);
    await updateDoc(settingsDocRef, { stayingWithOptions: updatedOptions });
    await logAudit('Update Staying With Option', `Renamed option from "${oldName}" to "${newName}"`, userInfo);
    return updatedOptions;
};

export const deleteStayingWithOption = async (optionToDelete: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const currentOptions = settings.stayingWithOptions;
    const updatedOptions = currentOptions.filter((s:string) => s !== optionToDelete);
    await updateDoc(settingsDocRef, { stayingWithOptions: updatedOptions });
    await logAudit('Delete Staying With Option', `Deleted option: ${optionToDelete}`, userInfo);
    return updatedOptions;
};

// Custom Person Fields
export const getCustomPersonFields = async (userInfo?: AppUser): Promise<CustomField[]> => {
    const settings = await ensureSettingsDoc();
    // Ensure all fields have a type and an id for backward compatibility
    return (settings.customPersonFields || []).map((f: any, index: number) => ({ 
        ...f, 
        id: f.id || `custom_${index}`,
        type: f.type || 'text',
        options: f.options || [],
    }));
};

export const saveCustomPersonFields = async (fields: CustomField[], userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    await updateDoc(settingsDocRef, { customPersonFields: fields });
    await logAudit('Update Custom Fields', `Updated custom fields definition.`, userInfo);
};

// WhatsApp Template
export const getWhatsAppTemplate = async (userInfo?: AppUser): Promise<string> => {
    const settings = await ensureSettingsDoc();
    return settings.whatsAppTemplate;
}

export const saveWhatsAppTemplate = async (template: string, userInfo: AppUser) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    await updateDoc(settingsDocRef, { whatsAppTemplate: template });
    await logAudit('Update WhatsApp Template', `Updated WhatsApp message template.`, userInfo);
}
