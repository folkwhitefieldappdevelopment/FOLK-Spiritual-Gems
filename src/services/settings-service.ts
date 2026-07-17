'use client';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { AppUser, CustomField, UserRole, ActivityFieldLabels, FolkStage, ExternalCoEnabler } from '@/lib/types';
import { folkStages } from '@/lib/types';
import { logAudit } from '@/services/audit-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const defaultContactSources = ['Govinda Temple', 'ITPL', 'HK hill', 'Govinda Residency', 'Other'];
const defaultOccupationStatuses = ['Working', 'Student', 'Searching for job', 'Self Employed'];
const defaultStayingWithOptions = ['PG / Hostel', 'Flat', 'Family', 'Temple Residency'];
const defaultActivityOptions = ['Yes', 'No', 'Partial'];
const defaultActivityFieldLabels: ActivityFieldLabels = { sg: 'SG-S', ma: 'SG-W', frp: 'FRP' };
const defaultGoalCategories = ['Trip Goal', 'Events'];
const defaultWhatsappReportTemplate = `Hare Krishna {enablerName}, could you help with {contactCountLabel}?

{contactList}

{question}`;

export type EnablerOption = { value: string; label: string };

/**
 * Checks if a specific dropdown value is currently used by any person in the database.
 */
async function isOptionInUse(fieldName: string, value: string, isArray: boolean = false): Promise<boolean> {
    const peopleRef = collection(db!, 'people');
    const q = query(
        peopleRef, 
        where(fieldName, isArray ? 'array-contains' : '==', value), 
        limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

/**
 * Checks if a goal category is currently assigned to any goals.
 */
async function isGoalCategoryInUse(value: string): Promise<boolean> {
    const goalsRef = collection(db!, 'goals');
    const q = query(goalsRef, where('category', '==', value), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
}

export const ensureSettingsDoc = async () => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (!docSnap.exists()) {
            const defaults = {
                contactSources: defaultContactSources,
                folkStages: folkStages,
                occupationStatuses: defaultOccupationStatuses,
                stayingWithOptions: defaultStayingWithOptions,
                customPersonFields: [],
                sgOptions: defaultActivityOptions,
                maOptions: defaultActivityOptions,
                frpOptions: defaultActivityOptions,
                activityFieldLabels: defaultActivityFieldLabels,
                goalCategories: defaultGoalCategories,
                whatsappReportTemplate: defaultWhatsappReportTemplate,
                eventNames: [],
                goalTitles: [],
                goalLabels: [],
            };
            
            await setDoc(settingsDocRef, defaults);
            return defaults;
        }
        return docSnap.data();
    } catch (error) {
        console.error("Error ensuring settings doc:", error);
        return null;
    }
}

export const getEnablers = async (userInfo: AppUser, context: 'filter' | 'assignment' = 'filter'): Promise<EnablerOption[]> => {
  const usersRef = collection(db!, 'users');
  let snapshot;
  
  if (userInfo.role.includes('Admin')) {
    snapshot = await getDocs(query(usersRef));
  } else if (userInfo.role.includes('Folk Guide')) {
    snapshot = await getDocs(query(usersRef, where('reportsTo.guideId', '==', userInfo.id)));
  } else {
    snapshot = await getDocs(query(usersRef, where('__name__', '==', userInfo.id)));
  }

  const assignees: AppUser[] = snapshot.docs.map(d => {
      const data = d.data();
      const role = data.role;
      
      if (userInfo.role.includes('Admin')) {
          const isEnabler = Array.isArray(role) ? role.includes('Folk Enabler') : role === 'Folk Enabler';
          if (!isEnabler) return null;
      }

      return { 
          id: d.id, 
          ...data, 
          role: Array.isArray(role) ? role : (role ? [role] : [])
      } as AppUser;
  }).filter((u): u is AppUser => u !== null);
  
  if (userInfo.role.includes('Folk Guide')) {
      if (!assignees.find(a => a.id === userInfo.id)) assignees.push(userInfo);
  }

  const uniqueUsersMap = new Map<string, AppUser>();
  assignees.forEach(user => {
      const email = (user.email || '').toLowerCase();
      if (!email) {
          uniqueUsersMap.set(user.id, user);
          return;
      }
      const existing = uniqueUsersMap.get(email);
      if (!existing || user.id.length > existing.id.length) {
          uniqueUsersMap.set(email, user);
      }
  });

  const deduplicatedAssignees = Array.from(uniqueUsersMap.values());
  const options = deduplicatedAssignees.map(a => ({ value: `${a.name}::${a.id}`, label: a.name }));
  
  if (context === 'filter') options.unshift({ value: '__UNASSIGNED__', label: 'Unassigned' });
  return options.sort((a, b) => a.label.localeCompare(b.label));
};

export const getContactSources = async (userInfo?: any): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return (settings?.contactSources || defaultContactSources).sort();
}

export const addContactSource = async (newSource: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current = settings?.contactSources || [];
    const exists = current.some((s: string) => s.toLowerCase() === newSource.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, newSource.trim()];
        
        updateDoc(settingsDocRef, { contactSources: updated }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: settingsDocRef.path,
            operation: 'update',
            requestResourceData: { contactSources: updated },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        if(userInfo) logAudit('Add Contact Source', `Added: ${newSource}`, userInfo);
        return updated;
    }
    return current;
}

export const updateContactSource = async (oldName: string, newName: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.contactSources || []).map((s:string) => s === oldName ? newName : s);
    
    updateDoc(settingsDocRef, { contactSources: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { contactSources: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Update Contact Source', `Renamed: ${oldName} to ${newName}`, userInfo);
    return updated;
}

export const deleteContactSource = async (sourceToDelete: string, userInfo?: AppUser) => {
    if (await isOptionInUse('contactSource', sourceToDelete, true)) {
        throw new Error(`Cannot delete '${sourceToDelete}' because it is currently assigned to one or more contacts.`);
    }
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.contactSources || []).filter((s:string) => s !== sourceToDelete);
    
    updateDoc(settingsDocRef, { contactSources: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { contactSources: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Delete Contact Source', `Deleted: ${sourceToDelete}`, userInfo);
    return updated;
}

export const getCurrentFolkStages = async (userInfo?: any): Promise<FolkStage[]> => {
    const settings = await ensureSettingsDoc();
    return settings?.folkStages || folkStages;
};

export const addCurrentFolkStage = async (newStage: FolkStage, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current = settings?.folkStages || [];
    const exists = current.some((s: string) => s.toLowerCase() === newStage.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, newStage.trim()];
        
        updateDoc(settingsDocRef, { folkStages: updated }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: settingsDocRef.path,
            operation: 'update',
            requestResourceData: { folkStages: updated },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        if (userInfo) logAudit('Add Folk Stage', `Added: ${newStage}`, userInfo);
        return updated;
    }
    return current;
};

export const updateCurrentFolkStage = async (oldName: FolkStage, newName: FolkStage, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.folkStages || []).map((s: FolkStage) => s === oldName ? newName : s);
    
    updateDoc(settingsDocRef, { folkStages: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { folkStages: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if (userInfo) logAudit('Update Folk Stage', `Renamed: ${oldName} to ${newName}`, userInfo);
    return updated;
};

export const deleteCurrentFolkStage = async (stageToDelete: FolkStage, userInfo?: AppUser) => {
    if (await isOptionInUse('currentFolkStage', stageToDelete)) {
        throw new Error(`Cannot delete stage '${stageToDelete}' because contacts are currently assigned to it.`);
    }
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.folkStages || []).filter((s: FolkStage) => s !== stageToDelete);
    
    updateDoc(settingsDocRef, { folkStages: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { folkStages: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if (userInfo) logAudit('Delete Folk Stage', `Deleted: ${stageToDelete}`, userInfo);
    return updated;
};

export const getOccupationStatuses = async (userInfo?: any): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return (settings?.occupationStatuses || defaultOccupationStatuses).sort();
};

export const addOccupationStatus = async (newStatus: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current = settings?.occupationStatuses || [];
    const exists = current.some((s: string) => s.toLowerCase() === newStatus.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, newStatus.trim()];
        
        updateDoc(settingsDocRef, { occupationStatuses: updated }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: settingsDocRef.path,
            operation: 'update',
            requestResourceData: { occupationStatuses: updated },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        if(userInfo) logAudit('Add Occupation Status', `Added: ${newStatus}`, userInfo);
        return updated;
    }
    return current;
};

export const updateOccupationStatus = async (oldName: string, newName: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.occupationStatuses || []).map((s:string) => s === oldName ? newName : s);
    
    updateDoc(settingsDocRef, { occupationStatuses: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { occupationStatuses: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Update Occupation Status', `Renamed: ${oldName} to ${newName}`, userInfo);
    return updated;
};

export const deleteOccupationStatus = async (statusToDelete: string, userInfo?: AppUser) => {
    if (await isOptionInUse('occupation', statusToDelete)) {
        throw new Error(`Cannot delete '${statusToDelete}' because it is assigned to contacts.`);
    }
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.occupationStatuses || []).filter((s:string) => s !== statusToDelete);
    
    updateDoc(settingsDocRef, { occupationStatuses: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { occupationStatuses: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Delete Occupation Status', `Deleted: ${statusToDelete}`, userInfo);
    return updated;
};

export const getStayingWithOptions = async (userInfo?: any): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return (settings?.stayingWithOptions || defaultStayingWithOptions).sort();
};

export const addStayingWithOption = async (newOption: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current = settings?.stayingWithOptions || [];
    const exists = current.some((s: string) => s.toLowerCase() === newOption.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, newOption.trim()];
        
        updateDoc(settingsDocRef, { stayingWithOptions: updated }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: settingsDocRef.path,
            operation: 'update',
            requestResourceData: { stayingWithOptions: updated },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        if(userInfo) logAudit('Add Staying With Option', `Added: ${newOption}`, userInfo);
        return updated;
    }
    return current;
};

export const updateStayingWithOption = async (oldName: string, newName: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.stayingWithOptions || []).map((s:string) => s === oldName ? newName : s);
    
    updateDoc(settingsDocRef, { stayingWithOptions: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { stayingWithOptions: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Update Staying With Option', `Renamed: ${oldName} to ${newName}`, userInfo);
    return updated;
};

export const deleteStayingWithOption = async (optionToDelete: string, userInfo?: AppUser) => {
    if (await isOptionInUse('stayingWith', optionToDelete)) {
        throw new Error(`Cannot delete '${optionToDelete}' because it is assigned to contacts.`);
    }
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.stayingWithOptions || []).filter((s:string) => s !== optionToDelete);
    
    updateDoc(settingsDocRef, { stayingWithOptions: updated }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { stayingWithOptions: updated },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Delete Staying With Option', `Deleted: ${optionToDelete}`, userInfo);
    return updated;
};

export async function getSgOptions() { const s = await ensureSettingsDoc(); return (s?.sgOptions || defaultActivityOptions).sort(); }
export async function addSgOption(n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const current = s?.sgOptions || [];
    const exists = current.some((x: string) => x.toLowerCase() === n.trim().toLowerCase());
    if (exists) return current;
    const uo = [...current, n.trim()]; 
    
    updateDoc(r, { sgOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { sgOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Add SG Option', n, u); 
    return uo; 
}
export async function updateSgOption(o: string, n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const uo = (s?.sgOptions || []).map((x:string)=>x===o?n:x); 
    
    updateDoc(r, { sgOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { sgOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Update SG Option', n, u); 
    return uo; 
}
export async function deleteSgOption(i: string, u?: AppUser) { 
    if (await isOptionInUse('lastSg', i)) {
        throw new Error(`Item '${i}' is currently used in call logs.`);
    }
    const r = doc(db!, 'settings', 'options'); const s = await ensureSettingsDoc(); const uo = (s?.sgOptions || []).filter((x:string)=>x!==i); 
    
    updateDoc(r, { sgOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { sgOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Delete SG Option', i, u); 
    return uo; 
}

export async function getMaOptions() { const s = await ensureSettingsDoc(); return (s?.maOptions || defaultActivityOptions).sort(); }
export async function addMaOption(n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const current = s?.maOptions || [];
    const exists = current.some((x: string) => x.toLowerCase() === n.trim().toLowerCase());
    if (exists) return current;
    const uo = [...current, n.trim()]; 
    
    updateDoc(r, { maOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { maOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Add MA Option', n, u); 
    return uo; 
}
export async function updateMaOption(o: string, n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const uo = (s?.maOptions || []).map((x:string)=>x===o?n:x); 
    
    updateDoc(r, { maOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { maOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Update MA Option', n, u); 
    return uo; 
}
export async function deleteMaOption(i: string, u?: AppUser) { 
    if (await isOptionInUse('lastMa', i)) {
        throw new Error(`Item '${i}' is currently used in call logs.`);
    }
    const r = doc(db!, 'settings', 'options'); const s = await ensureSettingsDoc(); const uo = (s?.maOptions || []).filter((x:string)=>x!==i); 
    
    updateDoc(r, { maOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { maOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Delete MA Option', i, u); 
    return uo; 
}

export async function getFrpOptions() { const s = await ensureSettingsDoc(); return (s?.frpOptions || defaultActivityOptions).sort(); }
export async function addFrpOption(n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const current = s?.frpOptions || [];
    const exists = current.some((x: string) => x.toLowerCase() === n.trim().toLowerCase());
    if (exists) return current;
    const uo = [...current, n.trim()]; 
    
    updateDoc(r, { frpOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { frpOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Add FRP Option', n, u); 
    return uo; 
}
export async function updateFrpOption(o: string, n: string, u?: AppUser) { 
    const r = doc(db!, 'settings', 'options'); 
    const s = await ensureSettingsDoc(); 
    const uo = (s?.frpOptions || []).map((x:string)=>x===o?n:x); 
    
    updateDoc(r, { frpOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { frpOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Update FRP Option', n, u); 
    return uo; 
}
export async function deleteFrpOption(i: string, u?: AppUser) { 
    if (await isOptionInUse('lastFrp', i)) {
        throw new Error(`Item '${i}' is currently used in call logs.`);
    }
    const r = doc(db!, 'settings', 'options'); const s = await ensureSettingsDoc(); const uo = (s?.frpOptions || []).filter((x:string)=>x!==i); 
    
    updateDoc(r, { frpOptions: uo }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: r.path,
        operation: 'update',
        requestResourceData: { frpOptions: uo },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(u) logAudit('Delete FRP Option', i, u); 
    return uo; 
}

export const getActivityFieldLabels = async (): Promise<ActivityFieldLabels> => {
    const settings = await ensureSettingsDoc();
    return settings?.activityFieldLabels || defaultActivityFieldLabels;
};

export const updateActivityFieldLabels = async (labels: ActivityFieldLabels, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    
    updateDoc(settingsDocRef, { activityFieldLabels: labels }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { activityFieldLabels: labels },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if (userInfo) logAudit('Update Activity Labels', `Labels: ${labels.sg}, ${labels.ma}, ${labels.frp}`, userInfo);
};

export const getCustomPersonFields = async (userInfo?: any): Promise<CustomField[]> => {
    const settings = await ensureSettingsDoc();
    return (settings?.customPersonFields || []).map((f: any, index: number) => ({ 
        ...f, 
        id: f.id || `custom_${index}`,
        type: f.type || 'text',
        options: f.options || [],
    }));
};

export const saveCustomPersonFields = async (fields: CustomField[], userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    
    updateDoc(settingsDocRef, { customPersonFields: fields }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: settingsDocRef.path,
        operation: 'update',
        requestResourceData: { customPersonFields: fields },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    if(userInfo) logAudit('Update Custom Fields', `Updated custom fields definition.`, userInfo);
};

export const getGoalCategories = async (userInfo?: any): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return (settings?.goalCategories || defaultGoalCategories).sort();
};

export const addGoalCategory = async (newCategory: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current = settings?.goalCategories || [];
    const exists = current.some((s: string) => s.toLowerCase() === newCategory.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, newCategory.trim()];
        updateDoc(settingsDocRef, { goalCategories: updated });
        if(userInfo) logAudit('Add Goal Category', `Added: ${newCategory}`, userInfo);
        return updated;
    }
    return current;
};

export const updateGoalCategory = async (oldName: string, newName: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.goalCategories || []).map((s:string) => s === oldName ? newName : s);
    updateDoc(settingsDocRef, { goalCategories: updated });
    if(userInfo) logAudit('Update Goal Category', `Renamed: ${oldName} to ${newName}`, userInfo);
    return updated;
};

export const deleteGoalCategory = async (categoryToDelete: string, userInfo?: AppUser) => {
    if (await isGoalCategoryInUse(categoryToDelete)) {
        throw new Error(`Cannot delete '${categoryToDelete}' because it is assigned to existing goals.`);
    }
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const updated = (settings?.goalCategories || []).filter((s:string) => s !== categoryToDelete);
    updateDoc(settingsDocRef, { goalCategories: updated });
    if(userInfo) logAudit('Delete Goal Category', `Deleted: ${categoryToDelete}`, userInfo);
    return updated;
};

export const getExternalCoEnablers = async (): Promise<ExternalCoEnabler[]> => {
  const collectionRef = collection(db!, 'externalCoEnablers');
  const snap = await getDocs(collectionRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExternalCoEnabler));
};

export const addExternalCoEnabler = async (data: Omit<ExternalCoEnabler, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>, userInfo: AppUser) => {
  const collectionRef = collection(db!, 'externalCoEnablers');
  const finalData = {
    ...data,
    createdBy: userInfo.id,
    createdByName: userInfo.name,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collectionRef, finalData);
  logAudit('Add External Co-Enabler', `Added volunteer: ${data.name}`, userInfo);
  return { id: docRef.id, ...finalData } as ExternalCoEnabler;
};

export const deleteExternalCoEnabler = async (id: string, userInfo: AppUser) => {
  const docRef = doc(db!, 'externalCoEnablers', id);
  await deleteDoc(docRef);
  logAudit('Delete External Co-Enabler', `Deleted volunteer record: ${id}`, userInfo);
};

/**
 * WhatsApp Report Request Template management.
 * Available tokens: {enablerName}, {contactList}, {question}, {contactCountLabel}
 */
export const getWhatsappReportTemplate = async (): Promise<string> => {
    const settings = await ensureSettingsDoc();
    return settings?.whatsappReportTemplate || defaultWhatsappReportTemplate;
};

export const updateWhatsappReportTemplate = async (template: string, userInfo?: AppUser) => {
    const settingsDocRef = doc(db!, 'settings', 'options');
    await updateDoc(settingsDocRef, { whatsappReportTemplate: template });
    if (userInfo) logAudit('Update WhatsApp Template', `Modified default report request template.`, userInfo);
};

// --- Autocomplete Helpers ---

type SettingsListKey = 'eventNames' | 'goalTitles' | 'goalLabels' | 'goalCategories';

const getGenericList = async (key: SettingsListKey): Promise<string[]> => {
    const settings = await ensureSettingsDoc();
    return ((settings as any)?.[key] || []).sort();
};

const addGenericItem = async (key: SettingsListKey, value: string, userInfo?: AppUser) => {
    if (!value?.trim()) return;
    const settingsDocRef = doc(db!, 'settings', 'options');
    const settings = await ensureSettingsDoc();
    const current: string[] = (settings as any)?.[key] || [];
    const exists = current.some((s: string) => s.toLowerCase() === value.trim().toLowerCase());
    if (!exists) {
        const updated = [...current, value.trim()];
        await updateDoc(settingsDocRef, { [key]: updated });
    }
};

export const getEventNames = () => getGenericList('eventNames');
export const addEventName = (name: string, u?: AppUser) => addGenericItem('eventNames', name, u);

export const getGoalTitles = () => getGenericList('goalTitles');
export const addGoalTitle = (title: string, u?: AppUser) => addGenericItem('goalTitles', title, u);

export const getGoalLabels = () => getGenericList('goalLabels');
export const addGoalLabel = (label: string, u?: AppUser) => addGenericItem('goalLabels', label, u);
