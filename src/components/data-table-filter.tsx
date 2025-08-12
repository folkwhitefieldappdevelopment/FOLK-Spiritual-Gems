
"use client";

import * as React from 'react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from './ui/separator';
import {
  ArrowUpAZ,
  ArrowDownAZ,
  Check,
  ChevronDown,
  ChevronRight,
  Filter as FilterIcon,
  Search,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

export type Condition = {
  operator: 'contains' | 'eq' | 'neq' | 'gt' | 'lt';
  value: string;
};

export type Filter = {
  condition?: Condition;
  values?: Set<string>;
};

type DataTableFilterProps = {
  columnName: string;
  allValues: (string | number)[];
  filter: Filter | undefined;
  onFilterChange: (filter: Filter | undefined) => void;
  onSort: (direction: 'asc' | 'desc') => void;
};

const operators: {
  label: string;
  value: 'contains' | 'eq' | 'neq' | 'gt' | 'lt';
}[] = [
  { label: 'Contains', value: 'contains' },
  { label: 'Is equal to', value: 'eq' },
  { label: 'Is not equal to', value: 'neq' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Less than', value: 'lt' },
];

export function DataTableFilter({
  columnName,
  allValues,
  filter,
  onFilterChange,
  onSort,
}: DataTableFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state for edits within the popover
  const [condition, setCondition] = React.useState<Condition | undefined>(filter?.condition);
  const [selectedValues, setSelectedValues] = React.useState<Set<string>>(filter?.values || new Set(allValues.map(String)));
  const [searchTerm, setSearchTerm] = React.useState('');

  // Sync local state when the popover opens
  React.useEffect(() => {
    if (isOpen) {
      setCondition(filter?.condition);
      setSelectedValues(filter?.values || new Set(allValues.map(String)));
      setSearchTerm('');
    }
  }, [isOpen, filter, allValues]);

  const uniqueValues = React.useMemo(() => {
    return Array.from(new Set(allValues)).map(String).sort();
  }, [allValues]);

  const filteredValuesForDisplay = React.useMemo(() => {
    return uniqueValues.filter(v =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueValues, searchTerm]);

  const handleApply = () => {
    const newFilter: Filter = {};
    if (condition?.value) {
      newFilter.condition = condition;
    }
    // Only set the values filter if it's not selecting all items
    if (selectedValues.size < uniqueValues.length) {
      newFilter.values = selectedValues;
    }
    
    if (Object.keys(newFilter).length > 0) {
      onFilterChange(newFilter);
    } else {
      onFilterChange(undefined);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onFilterChange(undefined);
    setIsOpen(false);
  };
  
  const handleSelectAll = () => {
      setSelectedValues(new Set(uniqueValues.map(String)));
  }

  const handleClearSelection = () => {
      setSelectedValues(new Set());
  }

  const toggleValue = (value: string) => {
    setSelectedValues(prev => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        return newSet;
    });
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
            {columnName}
            {filter && <FilterIcon className="ml-2 h-3 w-3" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col">
          <button onClick={() => onSort('asc')} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent w-full text-left">
            <ArrowUpAZ className="h-4 w-4" /> Sort A-Z
          </button>
          <button onClick={() => onSort('desc')} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent w-full text-left">
            <ArrowDownAZ className="h-4 w-4" /> Sort Z-A
          </button>
          <Separator />
          
          <Collapsible className="text-sm">
            <CollapsibleTrigger className="flex items-center justify-between px-3 py-2 hover:bg-accent w-full group">
                <span className="flex items-center gap-2"><ChevronRight className="h-4 w-4 group-data-[state=open]:rotate-90 transition-transform" /> Filter by condition</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-2 space-y-2 bg-muted/50">
                <Select value={condition?.operator} onValueChange={op => setCondition({ operator: op as any, value: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select operator..." /></SelectTrigger>
                    <SelectContent>
                        {operators.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {condition?.operator && (
                     <Input 
                        placeholder="Value..." 
                        value={condition.value} 
                        onChange={e => setCondition({ ...condition, value: e.target.value})}
                    />
                )}
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible defaultOpen className="text-sm">
            <CollapsibleTrigger className="flex items-center justify-between px-3 py-2 hover:bg-accent w-full group">
                <span className="flex items-center gap-2"><ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-0 group-data-[state=closed]:-rotate-90 transition-transform" /> Filter by values</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pt-0 pb-2">
                <div className="flex items-center justify-between text-blue-600 mb-2 px-1">
                    <button onClick={handleSelectAll} className="text-xs hover:underline">Select all</button>
                    <button onClick={handleClearSelection} className="text-xs hover:underline">Clear</button>
                </div>
                <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search values..." 
                        className="pl-8 h-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-1">
                {filteredValuesForDisplay.map(value => (
                  <div key={value} className="flex items-center space-x-2 p-1 rounded-md hover:bg-accent">
                    <Checkbox id={`val-${value}`} checked={selectedValues.has(value)} onCheckedChange={() => toggleValue(value)} />
                    <Label htmlFor={`val-${value}`} className="font-normal w-full">{value || '(Blanks)'}</Label>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
          
          <Separator />
          <div className="flex justify-end gap-2 p-2">
            <Button variant="ghost" onClick={handleClear}>Clear Filter</Button>
            <Button onClick={handleApply}>OK</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
