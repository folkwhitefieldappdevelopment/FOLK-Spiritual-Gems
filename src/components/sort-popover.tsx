
"use client";

import * as React from "react";
import { ArrowDownAZ, ArrowUpAZ, X } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Badge } from "./ui/badge";

export type SortDescriptor = {
  field: string;
  direction: 'asc' | 'desc';
};

type SortPopoverProps = {
  sortDescriptors: SortDescriptor[];
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>;
};

const sortableFields = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'fullName', label: 'Full Name' },
  { value: 'age', label: 'Age' },
  { value: 'sgRating', label: 'Rating' },
  { value: 'chantingStatus', label: 'Chanting' },
  { value: 'lastCallAt', label: 'Last Called' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'nativePlace', label: 'Native Place' },
];

export function SortPopover({ sortDescriptors, setSortDescriptors }: SortPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const addSort = () => {
    setSortDescriptors([...sortDescriptors, { field: 'createdAt', direction: 'desc' }]);
  };
  
  const removeSort = (index: number) => {
    const newDescriptors = [...sortDescriptors];
    newDescriptors.splice(index, 1);
    setSortDescriptors(newDescriptors);
  };
  
  const updateSort = (index: number, newSort: Partial<SortDescriptor>) => {
    const newDescriptors = [...sortDescriptors];
    newDescriptors[index] = { ...newDescriptors[index], ...newSort };
    setSortDescriptors(newDescriptors);
  };
  
  const toggleDirection = (index: number) => {
    const currentDirection = sortDescriptors[index].direction;
    updateSort(index, { direction: currentDirection === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort
          {sortDescriptors.length > 0 && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">{sortDescriptors.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-lg font-semibold">Sort Contacts</div>
          <p className="text-sm text-muted-foreground">Sort by multiple fields. The top field has the highest priority.</p>
          {sortDescriptors.length > 0 && (
              <div className="space-y-2">
                {sortDescriptors.map((sort, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Select
                            value={sort.field}
                            onValueChange={field => updateSort(index, { field })}
                        >
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{sortableFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => toggleDirection(index)}>
                            {sort.direction === 'asc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSort(index)}><X className="h-4 w-4" /></Button>
                    </div>
                ))}
              </div>
          )}
          <Button onClick={addSort} variant="outline" size="sm" disabled={sortDescriptors.length >= 3}>Add Sort Level</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
