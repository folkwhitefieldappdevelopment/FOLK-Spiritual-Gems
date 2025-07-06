
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
} from 'firebase/firestore';
import type { Person, AppUser } from '@/lib/types';

export const getPeople = async (appUser: AppUser | null): Promise<Person[]> => {
  if (!appUser) return [];

  const peopleCollection = collection(db, 'people');

  if (appUser.role.includes('Admin')) {
    const snapshot = await getDocs(peopleCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
  }

  if (appUser.role.includes('Folk Guide')) {
    const usersCollection = collection(db, 'users');
    const enablersQuery = query(usersCollection, where('reportsTo.guideId', '==', appUser.id));
    const enablersSnapshot = await getDocs(enablersQuery);
    const enablerNames = enablersSnapshot.docs.map(doc => doc.data().name as string);
    const managedNames = [appUser.name, ...enablerNames];

    // Firestore 'in' queries are limited to 30 items. If more are needed, this would require multiple queries.
    if (managedNames.length === 0) return [];
    
    // Chunk the array into parts of 30
    const chunks: string[][] = [];
    for (let i = 0; i < managedNames.length; i += 30) {
      chunks.push(managedNames.slice(i, i + 30));
    }
    
    const promises = chunks.map(chunk => {
        const q = query(peopleCollection, where('enablerInTouchWith', 'in', chunk));
        return getDocs(q);
    });

    const snapshots = await Promise.all(promises);
    const people: Person[] = [];
    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            people.push({ id: doc.id, ...doc.data() } as Person);
        });
    });
    return people;
  }

  // Default for Folk Enabler and any other role
  const q = query(peopleCollection, where('enablerInTouchWith', '==', appUser.name));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
};

export const getPerson = async (id: string): Promise<Person | null> => {
  const docRef = doc(db, 'people', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Person;
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

  // If unassigned, and the creator is a Folk Guide, auto-assign.
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
