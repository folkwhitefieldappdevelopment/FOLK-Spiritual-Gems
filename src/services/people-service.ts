
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  runTransaction,
  type DocumentSnapshot,
  deleteField,
} from 'firebase/firestore';
import type { Person, AppUser } from '@/lib/types';
import { logAudit } from './audit-service';

const processPersonDoc = (doc: DocumentSnapshot): Person => {
  const data = doc.data() as any; // Use 'any' to access potential legacy fields
  // Backward compatibility: If fullName is missing, construct it from firstName/lastName.
  if (!data.fullName && (data.firstName || data.lastName)) {
    data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  return { id: doc.id, ...data } as Person;
};

export const getPeople = async (appUser: AppUser | null): Promise<Person[]> => {
  if (!appUser) return [];

  const peopleCollection = collection(db, 'people');
  
  if (appUser.role.includes('Admin')) {
    const q = query(peopleCollection);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(processPersonDoc);
  }
  
  if (appUser.role.includes('Folk Guide')) {
    const q = query(peopleCollection, where('folkGuideId', '==', appUser.id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(processPersonDoc);
  }

  // Folk Enabler: must check for permanent assignment AND temporary co-enabler assignment
  const permanentQuery = query(peopleCollection, where('enablerInTouchWith', '==', appUser.name));
  const coEnablerQuery = query(peopleCollection, where('coEnablerId', '==', appUser.id));

  const [permanentSnapshot, coEnablerSnapshot] = await Promise.all([
      getDocs(permanentQuery),
      getDocs(coEnablerQuery)
  ]);

  const peopleMap = new Map<string, Person>();

  permanentSnapshot.docs.forEach(doc => {
      peopleMap.set(doc.id, processPersonDoc(doc));
  });

  coEnablerSnapshot.docs.forEach(doc => {
      if (!peopleMap.has(doc.id)) {
          peopleMap.set(doc.id, processPersonDoc(doc));
      }
  });
  
  return Array.from(peopleMap.values());
};

export const getPerson = async (id: string): Promise<Person | null> => {
  const docRef = doc(db, 'people', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return processPersonDoc(docSnap);
  }
  return null;
};

export const createPerson = async (
  personData: Omit<Person, 'id' | 'createdAt'>,
  appUser: AppUser
): Promise<Person> => {
  const peopleCollection = collection(db, 'people');
  const q = query(peopleCollection, where("phone", "==", personData.phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A contact with phone number ${personData.phone} already exists.`);
  }

  let assignedEnabler = personData.enablerInTouchWith;
  let { folkGuide, folkGuideId } = personData;

  // Auto-assignment for Folk Guide if not provided (e.g., by non-admin)
  if (!folkGuideId) {
    if (appUser.role.includes('Folk Guide')) {
      folkGuideId = appUser.id;
      folkGuide = `${appUser.name} (${appUser.fgCode || 'N/A'})`;
    } else if (appUser.role.includes('Folk Enabler') && appUser.reportsTo) {
      folkGuideId = appUser.reportsTo.guideId;
      folkGuide = `${appUser.reportsTo.guideName} (${appUser.reportsTo.guideFgCode || 'N/A'})`;
    }
  }

  // If unassigned, and the creator is a Folk Guide, auto-assign enabler.
  if (!assignedEnabler && appUser.role.includes('Folk Guide')) {
    const usersCollection = collection(db, 'users');
    const enablersQuery = query(usersCollection, where('reportsTo.guideId', '==', appUser.id));
    const enablersSnapshot = await getDocs(enablersQuery);
    // Sort enablers by name to ensure consistent order
    const enablers = enablersSnapshot.docs
      .map(doc => doc.data() as AppUser)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (enablers.length > 0) {
        const guideDocRef = doc(db, 'users', appUser.id);
        try {
            const newAssignedEnablerName = await runTransaction(db, async (transaction) => {
                const guideDoc = await transaction.get(guideDocRef);
                if (!guideDoc.exists()) {
                    throw "Folk Guide document not found!";
                }

                const guideData = guideDoc.data();
                const lastIndex = guideData.lastAssignedEnablerIndex ?? -1;
                const nextIndex = (lastIndex + 1) % enablers.length;
                
                const enablerToAssign = enablers[nextIndex];
                
                transaction.update(guideDocRef, { lastAssignedEnablerIndex: nextIndex });
                
                return enablerToAssign.name;
            });
            assignedEnabler = newAssignedEnablerName;
        } catch (e) {
            console.error("Transaction for auto-assignment failed: ", e);
            // Fallback: assign to the guide themselves if transaction fails
            assignedEnabler = appUser.name;
        }
    } else {
        // If no enablers, assign to the guide themselves
        assignedEnabler = appUser.name;
    }
  } else if (!assignedEnabler && appUser.role.includes('Folk Enabler')) {
    // If an enabler creates a contact without specifying, assign it to them by default.
    assignedEnabler = appUser.name;
  }

  const dataToSave = {
    fullName: personData.fullName || '',
    phone: personData.phone || '',
    photoUrl: personData.photoUrl || 'https://placehold.co/100x100.png',
    age: personData.age || 18,
    stayingWith: personData.stayingWith || 'Family',
    occupation: personData.occupation || 'Working',
    organisation: personData.organisation || '',
    rentDetails: personData.rentDetails || '',
    nativePlace: personData.nativePlace || '',
    sgRating: personData.sgRating || 0,
    contactSource: personData.contactSource || '',
    chantingStatus: personData.chantingStatus || '',
    fromOtherCamp: personData.fromOtherCamp || false,
    progress: personData.progress,
    customData: personData.customData || {},
    enablerInTouchWith: assignedEnabler || '',
    folkGuide: folkGuide || '',
    folkGuideId: folkGuideId || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(peopleCollection, dataToSave);
  await logAudit('Create Contact', `Created new contact: ${dataToSave.fullName} (${docRef.id})`, appUser);
  const newPerson: Person = {
    ...(dataToSave as Omit<Person, 'id'>),
    id: docRef.id,
    createdAt: new Date(),
  };
  return newPerson;
};

export const updatePerson = async (id: string, personData: Partial<Omit<Person, 'id'>>, appUser: AppUser | null = null): Promise<void> => {
  if (personData.phone) {
    const peopleCollection = collection(db, 'people');
    const q = query(peopleCollection, where("phone", "==", personData.phone));
    const querySnapshot = await getDocs(q);
    const conflictingPerson = querySnapshot.docs.find(doc => doc.id !== id);
    if (conflictingPerson) {
        throw new Error(`A contact with phone number ${personData.phone} already exists.`);
    }
  }
  const docRef = doc(db, 'people', id);
  await updateDoc(docRef, personData);
  if (appUser) {
    const person = await getPerson(id);
    await logAudit('Update Contact', `Updated details for contact: ${person?.fullName} (${id})`, appUser);
  }
};

export const deletePerson = async (id: string, appUser: AppUser): Promise<void> => {
  const person = await getPerson(id);
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
  if (person) {
    await logAudit('Delete Contact', `Deleted contact: ${person.fullName} (${id})`, appUser);
  }
};

export const deletePeople = async (ids: string[], appUser: AppUser): Promise<void> => {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, 'people', id);
    batch.delete(docRef);
  });
  await batch.commit();
  await logAudit('Delete Multiple Contacts', `Deleted ${ids.length} contacts: ${ids.join(', ')}`, appUser);
};

export const importPeople = async (
    people: Omit<Person, 'id' | 'createdAt'>[],
    appUser: AppUser
): Promise<void> => {
    if (people.length === 0) return;

    const assignedPeople = people.filter(p => p.enablerInTouchWith);
    const unassignedPeople = people.filter(p => !p.enablerInTouchWith);
    
    let peopleToImport = [...assignedPeople];
    let newLastAssignedIndex: number | undefined = undefined;

    // Determine Folk Guide info for the batch
    let folkGuideInfo: { folkGuide?: string; folkGuideId?: string } = {};
    if (appUser.role.includes('Folk Guide')) {
      folkGuideInfo.folkGuideId = appUser.id;
      folkGuideInfo.folkGuide = `${appUser.name} (${appUser.fgCode || 'N/A'})`;
    } else if (appUser.role.includes('Folk Enabler') && appUser.reportsTo) {
      folkGuideInfo.folkGuideId = appUser.reportsTo.guideId;
      folkGuideInfo.folkGuide = `${appUser.reportsTo.guideName} (${appUser.reportsTo.guideFgCode || 'N/A'})`;
    }


    if (unassignedPeople.length > 0 && appUser.role.includes('Folk Guide')) {
        const usersCollection = collection(db, 'users');
        const enablersQuery = query(usersCollection, where('reportsTo.guideId', '==', appUser.id));
        const enablersSnapshot = await getDocs(enablersQuery);
        // Sort enablers by name for consistent ordering
        const enablers = enablersSnapshot.docs
            .map(doc => ({id: doc.id, ...doc.data()} as AppUser))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (enablers.length > 0) {
            const guideDocRef = doc(db, 'users', appUser.id);
            const guideDoc = await getDoc(guideDocRef);
            let currentIndex = guideDoc.exists() ? (guideDoc.data().lastAssignedEnablerIndex ?? -1) : -1;

            const distributedPeople = unassignedPeople.map(person => {
                currentIndex = (currentIndex + 1) % enablers.length;
                return {
                    ...person,
                    enablerInTouchWith: enablers[currentIndex].name,
                };
            });
            peopleToImport.push(...distributedPeople);
            newLastAssignedIndex = currentIndex;
        } else {
            // No enablers, assign all to the guide
            const assignedToGuide = unassignedPeople.map(p => ({ ...p, enablerInTouchWith: appUser.name }));
            peopleToImport.push(...assignedToGuide);
        }
    } else if (unassignedPeople.length > 0 && appUser.role.includes('Folk Enabler')) {
        // Assign all to the enabler who is importing
        const assignedToEnabler = unassignedPeople.map(p => ({ ...p, enablerInTouchWith: appUser.name }));
        peopleToImport.push(...assignedToEnabler);
    } else {
        // Admins creating unassigned contacts, or no unassigned contacts for a guide.
        peopleToImport.push(...unassignedPeople);
    }
    
    const batch = writeBatch(db);
    peopleToImport.forEach((person) => {
        const docRef = doc(collection(db, 'people'));
        const dataToSave = {
            fullName: person.fullName || '',
            phone: person.phone || '',
            photoUrl: person.photoUrl || 'https://placehold.co/100x100.png',
            age: person.age || 18,
            stayingWith: person.stayingWith || 'Family',
            occupation: person.occupation || 'Working',
            organisation: person.organisation || '',
            rentDetails: person.rentDetails || '',
            nativePlace: person.nativePlace || '',
            sgRating: person.sgRating || 0,
            contactSource: person.contactSource || '',
            chantingStatus: person.chantingStatus || '',
            fromOtherCamp: person.fromOtherCamp || false,
            progress: person.progress,
            customData: person.customData || {},
            enablerInTouchWith: person.enablerInTouchWith || '',
            folkGuide: folkGuideInfo.folkGuide || person.folkGuide || '',
            folkGuideId: folkGuideInfo.folkGuideId || person.folkGuideId || '',
            createdAt: serverTimestamp()
        };
        batch.set(docRef, dataToSave);
    });

    if (newLastAssignedIndex !== undefined) {
        const guideDocRef = doc(db, 'users', appUser.id);
        batch.update(guideDocRef, { lastAssignedEnablerIndex: newLastAssignedIndex });
    }
    
    await batch.commit();
    await logAudit('Import Contacts', `Imported ${people.length} contacts from a file.`, appUser);
};

export const assignCoEnablerToPeople = async (personIds: string[], coEnabler: AppUser | null, appUser: AppUser): Promise<void> => {
  if (personIds.length === 0) return;
  const batch = writeBatch(db);
  personIds.forEach(id => {
    const docRef = doc(db, 'people', id);
    if (coEnabler) {
      batch.update(docRef, { 
        coEnablerId: coEnabler.id,
        coEnablerName: coEnabler.name 
      });
    } else {
      batch.update(docRef, {
        coEnablerId: deleteField(),
        coEnablerName: deleteField()
      });
    }
  });
  await batch.commit();
  const details = coEnabler 
    ? `Assigned ${coEnabler.name} as co-enabler for ${personIds.length} contacts.`
    : `Unassigned co-enabler from ${personIds.length} contacts.`;
  await logAudit('Assign Co-Enabler', details, appUser);
};
