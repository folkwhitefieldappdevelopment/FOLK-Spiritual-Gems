
import type { Person } from './types';
import { get } from 'lodash';
import type { FilterRule } from '@/components/filter-popover';

export type Condition = {
  operator: 'contains' | 'eq' | 'neq' | 'gt' | 'lt';
  value: string;
};

export type Filter = {
  condition?: Condition;
  values?: Set<string>;
};

export type FilterState = Record<string, Filter | undefined>;

export const applyClientSideFilters = (
  people: Person[], 
  tableFilters: FilterState,
  globalSearchTerm: string,
  advancedFilters: FilterRule[],
): Person[] => {
  let filteredPeople = people;

  // 1. Apply global text search
  if (globalSearchTerm) {
    const lowercasedTerm = globalSearchTerm.toLowerCase();
    filteredPeople = filteredPeople.filter(person => 
      person.fullName.toLowerCase().includes(lowercasedTerm) ||
      person.phone.includes(lowercasedTerm) ||
      (person.organisation && person.organisation.toLowerCase().includes(lowercasedTerm))
    );
  }

  // 2. Apply advanced filters
  if (advancedFilters.length > 0) {
    filteredPeople = filteredPeople.filter(person => {
        return advancedFilters.every(filter => {
            const personValue = get(person, filter.field);
            const filterValue = filter.value;

            // Handle boolean specifically, since 'false' can be a valid value
            if (typeof personValue === 'boolean') {
              if (filter.operator === 'is_true') return personValue === true;
              if (filter.operator === 'is_false') return personValue === false;
              return true;
            }

            if (filterValue === null || filterValue === undefined || filterValue === '') return true;

            const lowerPersonValue = String(personValue).toLowerCase();
            const lowerFilterValue = String(filterValue).toLowerCase();

            switch (filter.operator) {
                case 'eq': return lowerPersonValue == lowerFilterValue;
                case 'neq': return lowerPersonValue != lowerFilterValue;
                case 'gt': return Number(personValue) > Number(filterValue);
                case 'lt': return Number(personValue) < Number(filterValue);
                case 'gte': return Number(personValue) >= Number(filterValue);
                case 'lte': return Number(personValue) <= Number(filterValue);
                case 'contains': return lowerPersonValue.includes(lowerFilterValue);
                default: return true;
            }
        });
    });
  }

  // 3. Apply table column filters
  if (Object.keys(tableFilters).length > 0) {
    filteredPeople = filteredPeople.filter(person => {
      return Object.entries(tableFilters).every(([field, filter]) => {
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
          const values = new Set(Array.from(filter.values).map(v => String(v).toLowerCase()));
          const hasBlank = values.has('(blanks)');
          if (hasBlank) {
            values.delete('(blanks)');
            const isBlank = personValue === '' || personValue === null || personValue === undefined;
            valueMatch = isBlank || values.has(String(personValue).toLowerCase());
          } else {
            valueMatch = values.has(String(personValue).toLowerCase());
          }
        }

        return conditionMatch && valueMatch;
      });
    });
  }

  return filteredPeople;
};
