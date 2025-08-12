
import type { Person } from './types';
import { get } from 'lodash';

export type Condition = {
  operator: 'contains' | 'eq' | 'neq' | 'gt' | 'lt';
  value: string;
};

export type Filter = {
  condition?: Condition;
  values?: Set<string>;
};

export type FilterState = Record<string, Filter | undefined>;

export const applyClientSideFilters = (people: Person[], filters: FilterState): Person[] => {
  if (Object.keys(filters).length === 0) return people;

  return people.filter(person => {
    return Object.entries(filters).every(([field, filter]) => {
      if (!filter) return true;

      const personValue = get(person, field, '');
      let conditionMatch = true;
      let valueMatch = true;

      // Check condition filter
      if (filter.condition?.value) {
        const { operator, value: filterValue } = filter.condition;
        const lowerPersonValue = String(personValue).toLowerCase();
        const lowerFilterValue = String(filterValue).toLowerCase();

        switch (operator) {
          case 'contains':
            conditionMatch = lowerPersonValue.includes(lowerFilterValue);
            break;
          case 'eq':
            conditionMatch = lowerPersonValue === lowerFilterValue;
            break;
          case 'neq':
            conditionMatch = lowerPersonValue !== lowerFilterValue;
            break;
          case 'gt':
            conditionMatch = Number(personValue) > Number(filterValue);
            break;
          case 'lt':
            conditionMatch = Number(personValue) < Number(filterValue);
            break;
          default:
            conditionMatch = true;
        }
      }

      // Check values filter
      if (filter.values && filter.values.size > 0) {
        // Handle '(Blanks)' special case
        if (filter.values.has('(Blanks)')) {
            const otherValues = new Set(filter.values);
            otherValues.delete('(Blanks)');
            valueMatch = (personValue === '' || personValue === null || personValue === undefined) || otherValues.has(String(personValue));
        } else {
             valueMatch = filter.values.has(String(personValue));
        }
      }

      return conditionMatch && valueMatch;
    });
  });
};
