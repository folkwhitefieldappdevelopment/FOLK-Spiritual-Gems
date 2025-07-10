
'use client';

import * as React from 'react';
import { ChevronsUpDown, SortAsc, SortDesc, FilterX, Filter as FilterIcon } from 'lucide-react';
import type { Person } from '@/lib/types';
import type { SortDescriptor } from './sort-popover';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';

// Define the state for all column filters
export type ColumnFilterState = {
  [key in keyof Person]?: {
    values: Set<string>;
    // Future: add condition filters here if needed
  };
};

// Helper function to apply all column filters
export function applyColumnFilters(people: Person[], filters: ColumnFilterState): Person[] {
  if (Object.keys(filters).length === 0) {
    return people;
  }
  return people.filter(person => {
    return Object.entries(filters).every(([field, filter]) => {
      const personValue = person[field as keyof Person];
      const valueAsString = personValue === null || personValue === undefined ? '(Blanks)' : String(personValue);
      return filter.values.has(valueAsString);
    });
  });
}

type ColumnHeaderFilterProps = {
  column: {
    key: keyof Person;
    label: string;
  };
  sortDescriptors: SortDescriptor[];
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>;
  columnFilters: ColumnFilterState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFilterState>>;
  data: Person[];
};

export function ColumnHeaderFilter({
  column,
  sortDescriptors,
  setSortDescriptors,
  columnFilters,
  setColumnFilters,
  data,
}: ColumnHeaderFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentSort = sortDescriptors.find(s => s.field === column.key);
  const currentFilter = columnFilters[column.key];

  const uniqueValues = React.useMemo(() => {
    const values = new Set<string>();
    data.forEach(item => {
      const value = item[column.key];
      values.add(value === null || value === undefined ? '(Blanks)' : String(value));
    });
    return Array.from(values).sort();
  }, [data, column.key]);
  
  const [selectedValues, setSelectedValues] = React.useState<Set<string>>(currentFilter?.values || new Set(uniqueValues));

  React.useEffect(() => {
    setSelectedValues(currentFilter?.values || new Set(uniqueValues));
  }, [currentFilter, uniqueValues]);

  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDescriptors([{ field: column.key, direction }]);
    setIsOpen(false);
  };

  const handleApplyFilter = () => {
    if (selectedValues.size === uniqueValues.length) {
      // If all are selected, effectively remove the filter
      const newFilters = { ...columnFilters };
      delete newFilters[column.key];
      setColumnFilters(newFilters);
    } else {
      setColumnFilters(prev => ({
        ...prev,
        [column.key]: { values: selectedValues },
      }));
    }
    setIsOpen(false);
  };
  
  const handleClearFilter = () => {
    const newFilters = { ...columnFilters };
    delete newFilters[column.key];
    setColumnFilters(newFilters);
    setSelectedValues(new Set(uniqueValues));
    setIsOpen(false);
  };
  
  const handleSelectAll = () => {
    setSelectedValues(new Set(uniqueValues));
  };
  
  const handleClearSelection = () => {
    setSelectedValues(new Set());
  };

  const handleValueToggle = (value: string) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(value)) {
      newSelection.delete(value);
    } else {
      newSelection.add(value);
    }
    setSelectedValues(newSelection);
  };

  const isFiltered = !!currentFilter;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "-ml-3 h-8 data-[state=open]:bg-accent w-full justify-start",
            (currentSort || isFiltered) && 'text-primary'
          )}
        >
          <span>{column.label}</span>
          <div className="ml-auto flex items-center">
            {currentSort ? (
              currentSort.direction === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            ) : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
            {isFiltered && <FilterIcon className="ml-2 h-4 w-4" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 space-y-1">
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleSort('asc')}><SortAsc className="mr-2 h-4 w-4" /> Sort A-Z</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleSort('desc')}><SortDesc className="mr-2 h-4 w-4" /> Sort Z-A</Button>
        </div>
        <Separator />
        <div className="p-2">
            <p className="text-sm font-medium mb-2">Filter by values</p>
            {isFiltered && <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleClearFilter}><FilterX className="mr-2 h-4 w-4" />Clear filter from "{column.label}"</Button>}
        </div>
        <Separator />
        <Command>
          <CommandInput placeholder="Search values..." />
          <CommandList>
            <CommandEmpty>No values found.</CommandEmpty>
            <CommandGroup>
              <div className="p-2">
                <Button variant="link" className="p-0 h-auto" onClick={handleSelectAll}>Select all</Button>
                <span className="mx-1 text-muted-foreground">·</span>
                <Button variant="link" className="p-0 h-auto" onClick={handleClearSelection}>Clear</Button>
              </div>
              {uniqueValues.map(value => (
                <CommandItem
                  key={value}
                  onSelect={() => handleValueToggle(value)}
                  className="!pointer-events-auto !opacity-100"
                >
                  <Checkbox
                    className="mr-2"
                    checked={selectedValues.has(value)}
                    onCheckedChange={() => handleValueToggle(value)}
                    onClick={(e) => e.stopPropagation()} // prevent CommandItem onSelect
                  />
                  <span>{value}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <Separator />
        <div className="p-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyFilter}>OK</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

