
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

// Define the state for all column filters
export type ColumnFilter = {
  type: 'values' | 'condition';
  values: Set<string>;
  operator: string;
  conditionValue: any;
}

export type ColumnFilterState = {
  [key in keyof Person]?: Partial<ColumnFilter>;
};

const operators: Record<string, { value: string; label: string }[]> = {
  default: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [
    { value: 'is', label: 'is' },
  ],
};


// Helper function to apply all column filters
export function applyColumnFilters(people: Person[], filters: ColumnFilterState): Person[] {
  if (Object.keys(filters).length === 0) {
    return people;
  }
  return people.filter(person => {
    return Object.entries(filters).every(([field, filter]) => {
      const personValue = person[field as keyof Person];
      
      if (filter.type === 'condition') {
        const op = filter.operator;
        const filterValue = filter.conditionValue;
        
        if (op === 'is_empty') return personValue === null || personValue === undefined || personValue === '';
        if (op === 'is_not_empty') return personValue !== null && personValue !== undefined && personValue !== '';

        if (personValue === null || personValue === undefined) return false;
        
        const personString = String(personValue).toLowerCase();
        const filterString = String(filterValue).toLowerCase();

        switch(op) {
          case 'contains': return personString.includes(filterString);
          case 'not_contains': return !personString.includes(filterString);
          case 'is': return personString === filterString;
          case 'is_not': return personString !== filterString;
          default: return true;
        }

      } else { // 'values'
        if (!filter.values) return true;
        const valueAsString = personValue === null || personValue === undefined ? '(Blanks)' : String(personValue);
        return filter.values.has(valueAsString);
      }
    });
  });
}

type ColumnHeaderFilterProps = {
  column: {
    key: keyof Person;
    label: string;
    dataType?: 'string' | 'boolean';
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
  
  const [activeTab, setActiveTab] = React.useState(currentFilter?.type || 'values');
  const [selectedValues, setSelectedValues] = React.useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = React.useState('');
  const [conditionOperator, setConditionOperator] = React.useState(operators.default[0].value);
  const [conditionValue, setConditionValue] = React.useState('');

  const filteredUniqueValues = React.useMemo(() => {
    if (!searchValue) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(searchValue.toLowerCase()));
  }, [uniqueValues, searchValue]);

  React.useEffect(() => {
    if (isOpen) {
        const filter = columnFilters[column.key];
        setActiveTab(filter?.type || 'values');
        setSelectedValues(filter?.type === 'values' && filter.values ? filter.values : new Set(uniqueValues));
        setConditionOperator(filter?.type === 'condition' && filter.operator ? filter.operator : operators.default[0].value);
        setConditionValue(filter?.type === 'condition' && filter.conditionValue ? filter.conditionValue : '');
    } else {
        setSearchValue('');
    }
  }, [isOpen, columnFilters, column.key, uniqueValues]);


  const handleSort = (direction: 'asc' | 'desc') => {
    setSortDescriptors([{ field: column.key, direction }]);
    setIsOpen(false);
  };

  const handleApplyFilter = () => {
    if (activeTab === 'values') {
        if (selectedValues.size === uniqueValues.length) {
            handleClearFilter();
        } else {
            setColumnFilters(prev => ({
                ...prev,
                [column.key]: { type: 'values', values: selectedValues },
            }));
        }
    } else { // condition
        setColumnFilters(prev => ({
            ...prev,
            [column.key]: { type: 'condition', operator: conditionOperator, conditionValue: conditionValue },
        }));
    }
    setSearchValue('');
    setIsOpen(false);
  };
  
  const handleClearFilter = () => {
    const newFilters = { ...columnFilters };
    delete newFilters[column.key];
    setColumnFilters(newFilters);
    setSelectedValues(new Set(uniqueValues));
    setSearchValue('');
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
  const availableOperators = operators[column.dataType || 'default'];

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
        {isFiltered && (
            <>
                <div className="p-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleClearFilter}><FilterX className="mr-2 h-4 w-4" />Clear filter from "{column.label}"</Button>
                </div>
                <Separator />
            </>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="values">By values</TabsTrigger>
                <TabsTrigger value="condition">By condition</TabsTrigger>
            </TabsList>
            <TabsContent value="values">
                <Command>
                    <CommandInput 
                        placeholder="Search values..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList>
                        <CommandEmpty>No values found.</CommandEmpty>
                        <CommandGroup>
                        <div className="p-2">
                            <Button variant="link" className="p-0 h-auto" onClick={handleSelectAll}>Select all</Button>
                            <span className="mx-1 text-muted-foreground">·</span>
                            <Button variant="link" className="p-0 h-auto" onClick={handleClearSelection}>Clear</Button>
                        </div>
                        {filteredUniqueValues.map(value => (
                            <CommandItem
                            key={value}
                            onSelect={() => handleValueToggle(value)}
                            className="!pointer-events-auto !opacity-100"
                            value={value}
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
            </TabsContent>
            <TabsContent value="condition" className="p-4 space-y-4">
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select operator..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableOperators.map(op => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {conditionOperator !== 'is_empty' && conditionOperator !== 'is_not_empty' && (
                    <Input
                        placeholder="Value"
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                    />
                )}
            </TabsContent>
        </Tabs>
        <Separator />
        <div className="p-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyFilter}>OK</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
