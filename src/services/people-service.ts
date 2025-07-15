
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
} from 'firebase/firestore';
import type { Person, AppUser } from '@/lib/types';
import type { FilterRule } from '@/components/filter-popover';
import type { SortDescriptor } from '@/components/sort-popover';
import { logAudit } from './audit-service';

const processPersonDoc = (doc: DocumentSnapshot): Person => {
  const data = doc.data() as any;
  if (!data.fullName && (data.firstName || data.lastName)) {
    data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  }
  return { id: doc.id, ...data } as Person;
};

type GetPeopleResult = {
  people: Person[];
  totalCount: number;
};

export const getPeople = async (
    appUser: AppUser | null,
    {
        page = 1,
        pageSize = 10,
        filters = [],
        sortDescriptors = [{ field: 'createdAt', direction: 'desc' }],
        searchTerm = '',
        groupId,
    }: {
        page?: number;
        pageSize?: number;
        filters?: FilterRule[];
        sortDescriptors?: SortDescriptor[];
        searchTerm?: string;
        groupId?: string;
    }
): Promise<GetPeopleResult> => {
    if (!appUser) return { people: [], totalCount: 0 };

    const peopleCollection = collection(db, 'people');
    let queryConstraints: QueryConstraint[] = [];

    // --- Role-based Access Control ---
    if (appUser.role.includes('Admin')) {
        // Admin sees all. No additional constraint needed for access.
    } else if (appUser.role.includes('Folk Guide')) {
        queryConstraints.push(where('folkGuideId', '==', appUser.id));
    } else { // Folk Enabler
        queryConstraints.push(
            or(
                where('enablerInTouchWith', '==', appUser.name),
                where('coEnablerId', '==', appUser.id)
            )
        );
    }
    
    // --- Group Filter ---
    if (groupId) {
        const groupDoc = await doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupDoc);
        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            const memberIds = groupData.peopleIds || [];
            if (memberIds.length > 0) {
                 // Firestore 'in' queries are limited to 30 values.
                 // For groups larger than 30, this will fail.
                 // A more scalable solution would involve denormalizing group membership onto the person document.
                 // For now, we assume groups are smaller than 30.
                queryConstraints.push(where('__name__', 'in', memberIds));
            } else {
                 return { people: [], totalCount: 0 }; // Group has no members
            }
        } else {
             return { people: [], totalCount: 0 }; // Group not found
        }
    }

    // --- Advanced Filters ---
    const filterConstraints = filters.map(filter => {
        const { field, operator, value } = filter;
        if (operator === 'is_empty') return where(field, '==', '');
        if (operator === 'is_not_empty') return where(field, '!=', '');
        // Basic operators for now. More complex ones like 'contains' require more complex solutions (e.g., third-party search).
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
    }

    // --- Search Term (simple prefix search on fullName) ---
    if (searchTerm.trim()) {
        const term = searchTerm.trim();
        queryConstraints.push(where('fullName', '>=', term));
        queryConstraints.push(where('fullName', '<=', term + '\uf8ff'));
    }

    // --- Create Count and Data Queries ---
    const countQuery = query(peopleCollection, ...queryConstraints);
    
    const sortConstraints = sortDescriptors.map(desc => orderBy(desc.field, desc.direction));
    let dataQuery = query(peopleCollection, ...queryConstraints, ...sortConstraints, limit(pageSize));

    // --- Pagination ---
    if (page > 1) {
        const prevPageQuery = query(peopleCollection, ...queryConstraints, ...sortConstraints, limit((page - 1) * pageSize));
        const prevPageSnapshot = await getDocs(prevPageQuery);
        if (!prevPageSnapshot.empty) {
            const lastVisible = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
            dataQuery = query(dataQuery, startAfter(lastVisible));
        }
    }

    // --- Execute Queries ---
    const [countSnapshot, dataSnapshot] = await Promise.all([
        getCountFromServer(countQuery),
        getDocs(dataQuery)
    ]);
    
    const people = dataSnapshot.docs.map(processPersonDoc);
    const totalCount = countSnapshot.data().count;
    
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
    chantingStatus: personData.chantingStatus || 0,
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

  const batch = writeBatch(db);
  people.forEach((person) => {
    const docRef = doc(collection(db, 'people'));
    let assignedEnabler = person.enablerInTouchWith;
    let { folkGuide, folkGuideId } = person;

    // Auto-assign Folk Guide if not provided
    if (!folkGuideId && !folkGuide) {
      if (appUser.role.includes('Folk Guide')) {
        folkGuideId = appUser.id;
        folkGuide = `${appUser.name} (${appUser.fgCode || 'N/A'})`;
      } else if (appUser.role.includes('Folk Enabler') && appUser.reportsTo) {
        folkGuideId = appUser.reportsTo.guideId;
        folkGuide = `${appUser.reportsTo.guideName} (${appUser.reportsTo.guideFgCode || 'N/A'})`;
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
        createdAt: serverTimestamp()
    };
    batch.set(docRef, dataToSave);
  });
  
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

export const assignEnablerToPeople = async (personIds: string[], enabler: AppUser, appUser: AppUser | null): Promise<void> => {
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
    if (appUser) {
        await logAudit('Assign Enabler', `Assigned ${personIds.length} contacts to ${enabler.name}.`, appUser);
    }
};
