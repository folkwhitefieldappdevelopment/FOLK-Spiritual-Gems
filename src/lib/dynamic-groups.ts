
import type { Person, Group } from './types';

// The structure for defining a dynamic group
export type DynamicGroupDefinition = {
  id: string;
  name: string;
  description: string;
  filter: (person: Person) => boolean;
};

// Define all dynamic groups here
export const dynamicGroupDefinitions: DynamicGroupDefinition[] = [
  {
    id: 'dynamic-working-gems',
    name: 'Working Spiritual Gems',
    description: 'Working contacts with a rating greater than 4.',
    filter: (p) => (p.sgRating || 0) > 4 && p.occupation === 'Working',
  },
  {
    id: 'dynamic-student-gems',
    name: 'Student Spiritual Gems',
    description: 'Student contacts with a rating greater than 4.',
    filter: (p) => (p.sgRating || 0) > 4 && p.occupation === 'Student',
  },
  {
    id: 'dynamic-frp-yes',
    name: 'FRP (Yes)',
    description: 'Contacts who have attended FRP.',
    filter: (p) => p.lastFrp === true,
  },
  {
    id: 'dynamic-rating-5',
    name: 'Rating 5',
    description: 'Contacts with a rating of exactly 5.',
    filter: (p) => (p.sgRating || 0) === 5,
  },
  {
    id: 'dynamic-rating-4',
    name: 'Rating 4/4.5',
    description: 'Contacts with a rating of 4 or 4.5.',
    filter: (p) => (p.sgRating || 0) === 4 || (p.sgRating || 0) === 4.5,
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
      isDynamic: true, // Special flag to identify these groups
      visibility: [], // Dynamic groups are visible to all based on their own contact access
    };
  });
};
