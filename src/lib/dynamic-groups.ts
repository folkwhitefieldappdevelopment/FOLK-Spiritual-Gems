
import type { Person, Group, FolkStage } from './types';
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
