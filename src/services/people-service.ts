

'use server';

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
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  or,
  and,
  type QueryConstraint,
  arrayUnion,
} from 'firebase/firestore';
import type { Person, AppUser, UserRole } from '@/lib/types';
import { logAudit } from './audit-service';

const processPersonDoc = (doc: DocumentSnapshot): Person => {
  const data = doc.data() as any;
  if (!data.fullName && (data.firstName || data.lastName)) {
    data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  // Convert Firestore Timestamps to serializable strings
  if (data.createdAt?.toDate) {
    data.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.lastCallAt?.toDate) {
    data.lastCallAt = data.lastCallAt.toDate().toISOString();
  }
  if (Array.isArray(data.callHistory)) {
    data.callHistory = data.callHistory.map((log: any) => {
      if (log.calledAt?.toDate) {
        log.calledAt = log.calledAt.toDate().toISOString();
      }
      return log;
    });
  }

  return { id: doc.id, ...data } as Person;
};

type GetPeopleResult = {
  people: Person[];
  totalCount: number;
};

export const getPeople = async (
    options: { page?: number; pageSize?: number; search?: string } = {}
): Promise<GetPeopleResult> => {
    const { page = 1, pageSize = 25, search = '' } = options;

    const peopleCollection = collection(db, 'people');
    let queryConstraints: QueryConstraint[] = [];
    
    // --- Search ---
    if (search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        // This is a simple prefix search. For full-text search, a third-party service is recommended.
        queryConstraints.push(where('fullName_lowercase', '>=', searchTerm));
        queryConstraints.push(where('fullName_lowercase', '<=', searchTerm + '\uf8ff'));
    }

    // --- Pagination ---
    const countQuery = query(peopleCollection, ...queryConstraints);
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // --- Sorting ---
    queryConstraints.push(orderBy('createdAt', 'desc'));

    if (page > 1) {
        const lastVisibleQuery = query(peopleCollection, ...queryConstraints, limit((page - 1) * pageSize));
        const lastVisibleSnapshot = await getDocs(lastVisibleQuery);
        const lastVisible = lastVisibleSnapshot.docs[lastVisibleSnapshot.docs.length - 1];
        if (lastVisible) {
            queryConstraints.push(startAfter(lastVisible));
        }
    }
    
    queryConstraints.push(limit(pageSize));

    const finalQuery = query(peopleCollection, ...queryConstraints);
    const dataSnapshot = await getDocs(finalQuery);
    const allFetchedPeople = dataSnapshot.docs.map(processPersonDoc);

    return { people: allFetchedPeople, totalCount };
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
): Promise<Person> => {
  const peopleCollection = collection(db, 'people');
  const q = query(peopleCollection, where("phone", "==", personData.phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A contact with phone number ${personData.phone} already exists.`);
  }

  const dataToSave = {
    ...personData,
    fullName: personData.fullName || '',
    fullName_lowercase: (personData.fullName || '').toLowerCase(),
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
    chantingStatus: personData.chantingStatus || 0,
    fromOtherCamp: personData.fromOtherCamp || false,
    enablerInTouchWith: personData.enablerInTouchWith || '',
    folkGuide: personData.folkGuide || '',
    folkGuideId: personData.folkGuideId || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(peopleCollection, dataToSave);
  await logAudit('Create Contact', `Created new contact: ${dataToSave.fullName} (${docRef.id})`);
  
  const newPersonData = await getDoc(docRef);
  return processPersonDoc(newPersonData);
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
  const dataToUpdate: { [key: string]: any } = { ...personData };

  if(dataToUpdate.fullName) {
    dataToUpdate.fullName_lowercase = dataToUpdate.fullName.toLowerCase();
  }

  // Handle server-side operations based on placeholders
  if (dataToUpdate.lastCallAt) {
    dataToUpdate.lastCallAt = new Date(dataToUpdate.lastCallAt);
  }
  if (dataToUpdate.callHistory) {
      const historyEntry = { ...dataToUpdate.callHistory };
      historyEntry.calledAt = new Date(historyEntry.calledAt);
      dataToUpdate.callHistory = arrayUnion(historyEntry);
  }

  await updateDoc(docRef, dataToUpdate);
  const person = await getPerson(id);
  await logAudit('Update Contact', `Updated details for contact: ${person?.fullName} (${id})`);
};

export const deletePerson = async (id: string): Promise<void> => {
  const person = await getPerson(id);
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
  if (person) {
    await logAudit('Delete Contact', `Deleted contact: ${person.fullName} (${id})`);
  }
};

export const deletePeople = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, 'people', id);
    batch.delete(docRef);
  });
  await batch.commit();
  await logAudit('Delete Multiple Contacts', `Deleted ${ids.length} contacts: ${ids.join(', ')}`);
};

export const importPeople = async (
    people: Omit<Person, 'id' | 'createdAt'>[],
): Promise<void> => {
  if (people.length === 0) return;

  const batch = writeBatch(db);
  for (const person of people) {
    const peopleCollection = collection(db, 'people');
    const q = query(peopleCollection, where("phone", "==", person.phone));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        console.warn(`Skipping import for duplicate phone number: ${person.phone}`);
        continue;
    }
    
    const docRef = doc(collection(db, 'people'));
    const dataToSave = {
        ...person,
        fullName_lowercase: (person.fullName || '').toLowerCase(),
        enablerInTouchWith: person.enablerInTouchWith || '',
        folkGuide: person.folkGuide || '',
        folkGuideId: person.folkGuideId || '',
        createdAt: serverTimestamp()
    };
    batch.set(docRef, dataToSave);
  }
  
  await batch.commit();
  await logAudit('Import Contacts', `Imported ${people.length} contacts from a file.`);
};

export const assignCoEnablerToPeople = async (personIds: string[], coEnabler: AppUser | null): Promise<void> => {
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
  await logAudit('Assign Co-Enabler', details);
};

export const assignEnablerToPeople = async (personIds: string[], enabler: AppUser): Promise<void> => {
    if (personIds.length === 0) return;
    const batch = writeBatch(db);
    const guideInfo = enabler.reportsTo;
    
    personIds.forEach(id => {
        const docRef = doc(db, 'people', id);
        batch.update(docRef, { 
          enablerInTouchWith: enabler.name,
          folkGuide: guideInfo ? `${guideInfo.guideName} (${guideInfo.guideFgCode || 'N/A'})` : '',
          folkGuideId: guideInfo ? guideInfo.guideId : '',
        });
    });
    await batch.commit();
    await logAudit('Assign Enabler', `Assigned ${personIds.length} contacts to ${enabler.name}.`);
};
