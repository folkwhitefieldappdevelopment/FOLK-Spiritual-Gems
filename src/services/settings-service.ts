
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

const ensureSettingsDoc = async () => {
    const settingsDocRef = doc(db, 'settings', 'options');
    const docSnap = await getDoc(settingsDocRef);
    if (!docSnap.exists()) {
        await setDoc(settingsDocRef, {
            contactSources: defaultContactSources,
            customPersonFields: [],
        });
    }
    const data = docSnap.data() || {};
    if (!data.customPersonFields) {
        await setDoc(settingsDocRef, { customPersonFields: [] }, { merge: true });
    }
    
    return {
        contactSources: data.contactSources || defaultContactSources,
        customPersonFields: data.customPersonFields || [],
    };
}

export const getEnablers = async (appUser: AppUser | null): Promise<string[]> => {
    if (!appUser) return [];

    const usersCollection = collection(db, 'users');

    // Admin sees all Folk Enablers and Folk Guides
    if (appUser.role.includes('Admin')) {
        const enablersQuery = query(usersCollection, where('role', 'array-contains', 'Folk Enabler'));
        const enablersSnapshot = await getDocs(enablersQuery);
        const enablerNames = enablersSnapshot.docs.map(doc => doc.data().name as string);
        
        const guidesQuery = query(usersCollection, where('role', 'array-contains', 'Folk Guide'));
        const guidesSnapshot = await getDocs(guidesQuery);
        const guideNames = guidesSnapshot.docs.map(doc => doc.data().name as string);

        return [...new Set([...enablerNames, ...guideNames])].sort();
    }

    // A Folk Guide sees the enablers that report to them, plus themselves
    if (appUser.role.includes('Folk Guide')) {
        const enablersQuery = query(usersCollection, where('reportsTo.guideId', '==', appUser.id));
        const snapshot = await getDocs(enablersQuery);
        const enablerNames = snapshot.docs.map(doc => doc.data().name as string);
        return [appUser.name, ...enablerNames].sort();
    }
    
    // A Folk Enabler only sees themselves
    if (appUser.role.includes('Folk Enabler')) {
        return [appUser.name];
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
