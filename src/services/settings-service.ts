
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
import type { CustomField } from '@/lib/types';


const defaultEnablers = ['Veeranna', 'Sarthak', 'Jayant', 'Rohit', 'Nitin', 'Abhishek', 'Nikhil', 'Ravi', 'Narayan'];
const defaultContactSources = ['Govinda Temple', 'ITPL', 'HK hill'];

const ensureSettingsDoc = async () => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const docSnap = await getDoc(settingsDocRef);
    if (!docSnap.exists()) {
        await setDoc(settingsDocRef, {
            enablers: defaultEnablers,
            contactSources: defaultContactSources,
            customPersonFields: [],
        });
    }
    const data = docSnap.data() || {};
    if (!data.customPersonFields) {
        await setDoc(settingsDocRef, { customPersonFields: [] }, { merge: true });
    }
    
    return {
        enablers: data.enablers || defaultEnablers,
        contactSources: data.contactSources || defaultContactSources,
        customPersonFields: data.customPersonFields || [],
    };
}

export const getEnablers = async (): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.enablers;
}

export const getContactSources = async (): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return settings.contactSources;
}

export const addEnabler = async (newEnabler: string) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const currentEnablers = await getEnablers();
    if (!currentEnablers.includes(newEnabler)) {
        const updatedEnablers = [...currentEnablers, newEnabler];
        await setDoc(settingsDocRef, { enablers: updatedEnablers }, { merge: true });
        return updatedEnablers;
    }
    return currentEnablers;
}

export const addContactSource = async (newSource: string) => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const currentSources = await getContactSources();
    if (!currentSources.includes(newSource)) {
        const updatedSources = [...currentSources, newSource];
        await setDoc(settingsDocRef, { contactSources: updatedSources }, { merge: true });
        return updatedSources;
    }
    return currentSources;
}

export const updateEnabler = async (oldName: string, newName: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentEnablers = await getEnablers();
    const updatedEnablers = currentEnablers.map(e => e === oldName ? newName : e);
    batch.set(settingsDocRef, { enablers: updatedEnablers }, { merge: true });

    // 2. Update all people documents
    const peopleQuery = query(collection(db, 'people'), where('enablerInTouchWith', '==', oldName));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { enablerInTouchWith: newName });
    });

    await batch.commit();
    return updatedEnablers;
}

export const updateContactSource = async (oldName: string, newName: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentSources = await getContactSources();
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

export const deleteEnabler = async (enablerToDelete: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentEnablers = await getEnablers();
    const updatedEnablers = currentEnablers.filter(e => e !== enablerToDelete);
    batch.set(settingsDocRef, { enablers: updatedEnablers }, { merge: true });

    // 2. Update all people documents
    const peopleQuery = query(collection(db, 'people'), where('enablerInTouchWith', '==', enablerToDelete));
    const querySnapshot = await getDocs(peopleQuery);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { enablerInTouchWith: "" });
    });

    await batch.commit();
    return updatedEnablers;
}

export const deleteContactSource = async (sourceToDelete: string) => {
    const batch = writeBatch(db);
    const settingsDocRef = doc(db, 'settings', 'options');

    // 1. Update settings document
    const currentSources = await getContactSources();
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
