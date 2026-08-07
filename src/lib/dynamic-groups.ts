import type { Person, Group, FolkStage, EnablerStageBreakdown, EnablerChantingBreakdown, AppUser } from './types';
import { ELIMINATED_STATUSES } from './types';

// The structure for defining a dynamic group
export type DynamicGroupDefinition = {
  id: string;
  name: string;
  description: string;
  color: string;
  filter: (person: Person) => boolean;
};

// Define all dynamic groups here based on FolkStage, in the desired display order.
export const dynamicGroupDefinitions: DynamicGroupDefinition[] = [
  {
    id: 'dynamic-diamond-club-16',
    name: 'Diamond-club 16',
    description: "Contacts who are in the 'Diamond-club 16' stage.",
    color: 'bg-green-500',
    filter: (p) => p.currentFolkStage === 'Diamond-club 16' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-frj',
    name: 'FRJ',
    description: "Contacts who are in the 'FRJ' stage.",
    color: 'bg-green-500',
    filter: (p) => p.currentFolkStage === 'FRJ' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-frp',
    name: 'FRP',
    description: "Contacts who are in the 'FRP' stage.",
    color: 'bg-green-500',
    filter: (p) => p.currentFolkStage === 'FRP' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-sg-w',
    name: 'SG-W',
    description: "Contacts who are in the 'SG-W' stage.",
    color: 'bg-yellow-500',
    filter: (p) => p.currentFolkStage === 'SG-W' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-sg-s',
    name: 'SG-S',
    description: "Contacts who are in the 'SG-S' stage.",
    color: 'bg-yellow-500',
    filter: (p) => p.currentFolkStage === 'SG-S' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-21-days-challenge',
    name: '21 Days Challenge',
    description: "Contacts who are in the '21 Days Challenge' stage.",
    color: 'bg-gray-800',
    filter: (p) => p.currentFolkStage === '21 Days Challenge' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-interested',
    name: 'Interested (Visited Residency or Temple)',
    description: "Contacts who are in the 'Interested' stage.",
    color: 'bg-gray-400',
    filter: (p) => p.currentFolkStage === 'Interested (Visited Residency or Temple)' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
   {
    id: 'dynamic-fresh-lead',
    name: 'Fresh Lead',
    description: "New contacts who have not yet been assigned a specific stage.",
    color: 'bg-blue-500',
    filter: (p) => (p.currentFolkStage === 'Fresh Lead' || !p.currentFolkStage) && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-inactive',
    name: 'Club 16 - Inactive',
    description: "Contacts who are in the 'Club 16 - Inactive' stage.",
    color: 'bg-red-500',
    filter: (p) => p.currentFolkStage === 'Club 16 - Inactive' && !p.isDeleted && !ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
  {
    id: 'dynamic-recycle-bin',
    name: 'Recycle Bin (Deleted Contacts)',
    description: "Contacts who were deleted and can be restored.",
    color: 'bg-destructive',
    filter: (p) => p.isDeleted === true,
  },
  {
    id: 'dynamic-shifted-not-interested',
    name: 'Shifted, Not Interested or Wrong Number',
    description: "All discarded contacts based on their last call status.",
    color: 'bg-slate-900',
    filter: (p) => !p.isDeleted && ELIMINATED_STATUSES.includes(p.lastCallStatus || ''),
  },
];


// Function to generate the group objects from definitions and contacts
export const generateDynamicGroups = (people: Person[]): Group[] => {
  return dynamicGroupDefinitions.map((def) => {
    const matchingPeople = people.filter(def.filter);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      peopleIds: matchingPeople.map((p) => p.id),
      memberCount: matchingPeople.length,
      isDynamic: true,
      visibility: [],
      color: def.color,
      createdBy: 'system',
      createdByName: 'System',
      creatorRole: ['Admin'],
      sharedWithUserIds: [],
    };
  });
};

/**
 * Computes the stage distribution for each enabler in the roster.
 * Sorted by priority: sixteenRounder → frp → sgW → sgS.
 */
export function computeEnablerStageBreakdown(people: Person[], enablers: AppUser[]): EnablerStageBreakdown[] {
  const frpFilter = dynamicGroupDefinitions.find(d => d.id === 'dynamic-frp')?.filter;
  const sgsFilter = dynamicGroupDefinitions.find(d => d.id === 'dynamic-sg-s')?.filter;
  const sgwFilter = dynamicGroupDefinitions.find(d => d.id === 'dynamic-sg-w')?.filter;

  return enablers.map(enabler => {
    const enablerPeople = people.filter(p => {
      if (p.isDeleted) return false;
      const matchesId = p.enablerId === enabler.id;
      // Legacy fallback: check name if ID is missing
      const matchesName = !p.enablerId && p.enablerInTouchWith && p.enablerInTouchWith.split('::')[0].trim().toLowerCase() === enabler.name.trim().toLowerCase();
      return matchesId || matchesName;
    });

    return {
      enablerId: enabler.id,
      enablerName: enabler.name,
      frp: enablerPeople.filter(p => frpFilter ? frpFilter(p) : p.currentFolkStage === 'FRP').length,
      sgS: enablerPeople.filter(p => sgsFilter ? sgsFilter(p) : p.currentFolkStage === 'SG-S').length,
      sgW: enablerPeople.filter(p => sgwFilter ? sgwFilter(p) : p.currentFolkStage === 'SG-W').length,
      sixteenRounder: enablerPeople.filter(p => (p.chantingStatus || 0) >= 16).length,
      totalContacts: enablerPeople.length
    };
  }).sort((a, b) => b.sixteenRounder - a.sixteenRounder || b.frp - a.frp || b.sgW - a.sgW || b.sgS - a.sgS);
}

/**
 * Computes chanting round distribution for each enabler.
 * Buckets: 16+, 9-15, 3-8, 0-2.
 */
export function computeEnablerChantingBreakdown(people: Person[], enablers: AppUser[]): EnablerChantingBreakdown[] {
  return enablers.map(enabler => {
    const enablerPeople = people.filter(p => {
      if (p.isDeleted) return false;
      const matchesId = p.enablerId === enabler.id;
      const matchesName = !p.enablerId && p.enablerInTouchWith && p.enablerInTouchWith.split('::')[0].trim().toLowerCase() === enabler.name.trim().toLowerCase();
      return matchesId || matchesName;
    });

    return {
      enablerId: enabler.id,
      enablerName: enabler.name,
      rounds16Plus: enablerPeople.filter(p => (p.chantingStatus || 0) >= 16).length,
      rounds9to15: enablerPeople.filter(p => (p.chantingStatus || 0) >= 9 && (p.chantingStatus || 0) <= 15).length,
      rounds3to8: enablerPeople.filter(p => (p.chantingStatus || 0) >= 3 && (p.chantingStatus || 0) <= 8).length,
      rounds0to2: enablerPeople.filter(p => (p.chantingStatus || 0) >= 0 && (p.chantingStatus || 0) <= 2).length,
      totalContacts: enablerPeople.length
    };
  }).sort((a, b) => 
    b.rounds16Plus - a.rounds16Plus || 
    b.rounds9to15 - a.rounds9to15 || 
    b.rounds3to8 - a.rounds3to8 || 
    b.rounds0to2 - a.rounds0to2
  );
}

/**
 * Generic helper to group flat items by the team assigned to an enabler.
 */
export function groupByTeam<T>(items: T[], enablers: AppUser[], getEnablerId: (item: T) => string, getEnablerNameFallback?: (item: T) => string) {
  const groupsMap = new Map<string | null, { teamId: string | null, teamName: string, items: T[] }>();
  
  items.forEach(item => {
    const id = getEnablerId(item);
    const fallbackName = getEnablerNameFallback?.(item);
    
    // Find enabler by ID or by Name fallback
    const enabler = enablers.find(e => e.id === id) || 
                   (fallbackName ? enablers.find(e => e.name.trim().toLowerCase() === fallbackName.trim().toLowerCase()) : null);
                   
    const teamId = enabler?.team?.teamId || null;
    const teamName = enabler?.team?.teamName || "Unassigned";
    
    if (!groupsMap.has(teamId)) {
      groupsMap.set(teamId, { teamId, teamName, items: [] });
    }
    groupsMap.get(teamId)!.items.push(item);
  });
  
  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.teamId === null) return 1;
    if (b.teamId === null) return -1;
    return a.teamName.localeCompare(b.teamName);
  });
}
