'use client';

import * as React from 'react';
import { GripVertical, Plus, Trash2, X, ArrowDownUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export type SortDescriptor = {
  field: string;
  direction: 'asc' | 'desc';
};

const sortableFields = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'fullName', label: 'Name' },
  { value: 'age', label: 'Age' },
  { value: 'sgRating', label: 'Rating' },
  { value: 'organisation', label: 'Organisation' },
];

type SortPopoverProps = {
  sortDescriptors: SortDescriptor[];
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>;
};

export function SortPopover({ sortDescriptors, setSortDescriptors }: SortPopoverProps) {
  const handleUpdateDescriptor = (index: number, field: keyof SortDescriptor, value: string) => {
    const newDescriptors = [...sortDescriptors];
    newDescriptors[index] = { ...newDescriptors[index], [field]: value };
    setSortDescriptors(newDescriptors);
  };

  const handleAddSort = () => {
    const usedFields = new Set(sortDescriptors.map(d => d.field));
    const availableField = sortableFields.find(f => !usedFields.has(f.value));
    
    if (availableField) {
        setSortDescriptors([
          ...sortDescriptors,
          { field: availableField.value, direction: 'asc' },
        ]);
    }
  };

  const handleRemoveSort = (index: number) => {
    const newDescriptors = sortDescriptors.filter((_, i) => i !== index);
    if (newDescriptors.length === 0) {
        handleClearSort();
    } else {
        setSortDescriptors(newDescriptors);
    }
  };

  const handleClearSort = () => {
    setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
  };
  
  const canAddMore = sortDescriptors.length < sortableFields.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ArrowDownUp className="mr-2 h-4 w-4" />
          Sort
          {sortDescriptors.length > 0 && (
              <span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {sortDescriptors.length}
              </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Sort by</h4>
            <p className="text-sm text-muted-foreground">
              Add multiple criteria to sort your contacts.
            </p>
          </div>
          <div className="grid gap-2">
            {sortDescriptors.map((descriptor, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Select
                  value={descriptor.field}
                  onValueChange={(value) =>
                    handleUpdateDescriptor(index, 'field', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortableFields.map((field) => (
                      <SelectItem key={field.value} value={field.value} disabled={sortDescriptors.some((d, i) => i !== index && d.field === field.value)}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={descriptor.direction}
                  onValueChange={(value: 'asc' | 'desc') =>
                    handleUpdateDescriptor(index, 'direction', value)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveSort(index)}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove sort</span>
                </Button>
              </div>
            ))}
          </div>
           <Separator />
          <div className="flex justify-between items-center">
             <Button variant="ghost" size="sm" onClick={handleAddSort} disabled={!canAddMore}>
                <Plus className="mr-2 h-4 w-4" />
                Add Sort
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearSort} disabled={sortDescriptors.length === 1 && sortDescriptors[0].field === 'createdAt' && sortDescriptors[0].direction === 'desc'}>
                Clear Sort
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
