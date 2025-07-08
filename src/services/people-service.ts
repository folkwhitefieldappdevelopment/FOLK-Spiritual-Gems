
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
} from 'firebase/firestore';
import type { Person, AppUser } from '@/lib/types';

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
  let q;

  if (appUser.role.includes('Admin')) {
    q = query(peopleCollection);
  } else if (appUser.role.includes('Folk Guide')) {
    q = query(peopleCollection, where('folkGuideId', '==', appUser.id));
  } else {
    // Default for Folk Enabler and any other role
    q = query(peopleCollection, where('enablerInTouchWith', '==', appUser.name));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(processPersonDoc);
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
    ...personData,
    enablerInTouchWith: assignedEnabler || '',
    folkGuide: folkGuide || '',
    folkGuideId: folkGuideId || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(peopleCollection, dataToSave);
  const newPerson: Person = {
    ...(dataToSave as Omit<Person, 'id'>),
    id: docRef.id,
    createdAt: new Date(),
  };
  return newPerson;
};

export const updatePerson = async (id: string, personData: Partial<Omit<Person, 'id'>>): Promise<void> => {
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
};

export const deletePerson = async (id: string): Promise<void> => {
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
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
        const dataWithTimestamp = {
            ...person,
            ...folkGuideInfo,
            createdAt: serverTimestamp()
        };
        batch.set(docRef, dataWithTimestamp);
    });

    if (newLastAssignedIndex !== undefined) {
        const guideDocRef = doc(db, 'users', appUser.id);
        batch.update(guideDocRef, { lastAssignedEnablerIndex: newLastAssignedIndex });
    }
    
    await batch.commit();
}
