

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
import type { FilterRule } from '@/components/filter-popover';
import type { SortDescriptor } from '@/components/sort-popover';
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

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export const getPeople = async (
    userInfo: UserInfo,
    options: {
        page?: number;
        pageSize?: number;
        filters?: FilterRule[];
        sortDescriptors?: SortDescriptor[];
        searchTerm?: string;
        groupId?: string;
    } = {}
): Promise<GetPeopleResult> => {
    if (!userInfo) return { people: [], totalCount: 0 };
    
    const {
        page = 1,
        pageSize = 10,
        filters = [],
        sortDescriptors: initialSortDescriptors = [],
        searchTerm = '',
        groupId,
    } = options;

    const peopleCollection = collection(db, 'people');
    let queryConstraints: QueryConstraint[] = [];
    let sortDescriptors = initialSortDescriptors;
    
    let isComplexQuery = false;

    // --- Role-based Access Control ---
    if (userInfo.role.includes('Admin')) {
        // No additional constraints needed.
    } else if (userInfo.role.includes('Folk Guide')) {
        queryConstraints.push(where('folkGuideId', '==', userInfo.id));
        isComplexQuery = true;
    } else { // Folk Enabler
        queryConstraints.push(
            or(
                where('enablerInTouchWith', '==', userInfo.name),
                where('coEnablerId', '==', userInfo.id)
            )
        );
        isComplexQuery = true;
    }
    
    // --- Group Filter ---
    if (groupId) {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupDocRef);
        if (groupSnap.exists()) {
            const memberIds = groupSnap.data().peopleIds || [];
            if (memberIds.length > 0) {
                 if (memberIds.length > 30) {
                    console.warn(`Group ${groupId} has more than 30 members, exceeding Firestore's 'in' query limit. Only the first 30 will be shown.`);
                    queryConstraints.push(where('__name__', 'in', memberIds.slice(0, 30)));
                 } else {
                    queryConstraints.push(where('__name__', 'in', memberIds));
                 }
            } else {
                 return { people: [], totalCount: 0 };
            }
        } else {
             return { people: [], totalCount: 0 };
        }
    }

    // --- Advanced Filters ---
    const filterConstraints = filters.map(filter => {
        const { field, operator, value } = filter;
        if (operator === 'is_empty') return where(field, '==', '');
        if (operator === 'is_not_empty') return where(field, '!=', '');
        if (operator === 'is') return where(field, '==', value);
        if (operator === 'is_not') return where(field, '!=', value);
        if (operator === 'gt') return where(field, '>', value);
        if (operator === 'lt') return where(field, '<', value);
        if (operator === 'gte') return where(field, '>=', value);
        if (operator === 'lte') return where(field, '<=', value);
        return null;
    }).filter((c): c is QueryConstraint => c !== null);

    if (filterConstraints.length > 0) {
        queryConstraints.push(and(...filterConstraints));
        isComplexQuery = true;
    }

    // --- Search Term ---
    if (searchTerm.trim()) {
        const term = searchTerm.trim();
        queryConstraints.push(where('fullName', '>=', term));
        queryConstraints.push(where('fullName', '<=', term + '\uf8ff'));
        isComplexQuery = true;
    }

    // --- Sorting ---
    // If no sort is provided and it's not a complex query, apply default.
    // Otherwise, let Firestore use its default order to avoid index errors.
    if (sortDescriptors.length === 0 && !isComplexQuery) {
      sortDescriptors = [{ field: 'createdAt', direction: 'desc' }];
    }
    const sortConstraints = sortDescriptors.map(desc => orderBy(desc.field, desc.direction));

    // --- Count Query (without pagination/sorting) ---
    const countQuery = query(peopleCollection, ...queryConstraints);
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // --- Data Query (with pagination and sorting) ---
    let dataQuery = query(peopleCollection, ...queryConstraints, ...sortConstraints, limit(pageSize));
    if (page > 1) {
        const prevPageQuery = query(peopleCollection, ...queryConstraints, ...sortConstraints, limit((page - 1) * pageSize));
        const prevPageSnapshot = await getDocs(prevPageQuery);
        if (!prevPageSnapshot.empty) {
            const lastVisible = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
            dataQuery = query(dataQuery, startAfter(lastVisible));
        }
    }
    
    const dataSnapshot = await getDocs(dataQuery);
    const people = dataSnapshot.docs.map(processPersonDoc);
    
    return { people, totalCount };
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
  userInfo: UserInfo
): Promise<Person> => {
  const peopleCollection = collection(db, 'people');
  const q = query(peopleCollection, where("phone", "==", personData.phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`A contact with phone number ${personData.phone} already exists.`);
  }

  let assignedEnabler = personData.enablerInTouchWith;
  let { folkGuide, folkGuideId } = personData;

  // Auto-assignment for Folk Guide if not provided
  if (!folkGuideId) {
    if (userInfo.role.includes('Folk Guide')) {
      folkGuideId = userInfo.id;
      folkGuide = `${userInfo.name}`; 
    }
  }

  const dataToSave = {
    ...personData,
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
    chantingStatus: personData.chantingStatus || 0,
    fromOtherCamp: personData.fromOtherCamp || false,
    enablerInTouchWith: assignedEnabler || '',
    folkGuide: folkGuide || '',
    folkGuideId: folkGuideId || '',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(peopleCollection, dataToSave);
  await logAudit('Create Contact', `Created new contact: ${dataToSave.fullName} (${docRef.id})`, userInfo);
  
  const newPersonData = await getDoc(docRef);
  return processPersonDoc(newPersonData);
};

export const updatePerson = async (id: string, personData: Partial<Omit<Person, 'id'>>, userInfo: UserInfo | null = null): Promise<void> => {
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

  // Handle server-side operations based on placeholders
  if (dataToUpdate.lastCallAt === 'SERVER_TIMESTAMP') {
    dataToUpdate.lastCallAt = serverTimestamp();
  }
  if (dataToUpdate.callHistory) {
      const historyEntry = dataToUpdate.callHistory;
      dataToUpdate.callHistory = arrayUnion(historyEntry);
  }

  await updateDoc(docRef, dataToUpdate);
  if (userInfo) {
    const person = await getPerson(id);
    await logAudit('Update Contact', `Updated details for contact: ${person?.fullName} (${id})`, userInfo);
  }
};

export const deletePerson = async (id: string, userInfo: UserInfo): Promise<void> => {
  const person = await getPerson(id);
  const docRef = doc(db, 'people', id);
  await deleteDoc(docRef);
  if (person) {
    await logAudit('Delete Contact', `Deleted contact: ${person.fullName} (${id})`, userInfo);
  }
};

export const deletePeople = async (ids: string[], userInfo: UserInfo): Promise<void> => {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, 'people', id);
    batch.delete(docRef);
  });
  await batch.commit();
  await logAudit('Delete Multiple Contacts', `Deleted ${ids.length} contacts: ${ids.join(', ')}`, userInfo);
};

export const importPeople = async (
    people: Omit<Person, 'id' | 'createdAt'>[],
    userInfo: UserInfo
): Promise<void> => {
  if (people.length === 0) return;

  const peopleCollection = collection(db, 'people');
  for (const person of people) {
    const q = query(peopleCollection, where("phone", "==", person.phone));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        console.warn(`Skipping import for duplicate phone number: ${person.phone}`);
        continue;
    }

    let assignedEnabler = person.enablerInTouchWith;
    let { folkGuide, folkGuideId } = person;

    if (!folkGuideId && !folkGuide) {
      if (userInfo.role.includes('Folk Guide')) {
        folkGuideId = userInfo.id;
        folkGuide = `${userInfo.name}`;
      }
    }

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
        chantingStatus: person.chantingStatus || 0,
        fromOtherCamp: person.fromOtherCamp || false,
        progress: person.progress,
        customData: person.customData || {},
        enablerInTouchWith: assignedEnabler || '',
        folkGuide: folkGuide || '',
        folkGuideId: folkGuideId || '',
        lastCallRemark: person.lastCallRemark || '',
        createdAt: serverTimestamp()
    };
    await addDoc(peopleCollection, dataToSave);
  }
  
  await logAudit('Import Contacts', `Imported ${people.length} contacts from a file.`, userInfo);
};

export const assignCoEnablerToPeople = async (personIds: string[], coEnabler: AppUser | null, userInfo: UserInfo): Promise<void> => {
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
  await logAudit('Assign Co-Enabler', details, userInfo);
};

export const assignEnablerToPeople = async (personIds: string[], enabler: AppUser, userInfo: UserInfo | null): Promise<void> => {
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
    if (userInfo) {
        await logAudit('Assign Enabler', `Assigned ${personIds.length} contacts to ${enabler.name}.`, userInfo);
    }
};
