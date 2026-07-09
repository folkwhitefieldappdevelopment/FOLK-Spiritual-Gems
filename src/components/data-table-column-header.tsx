
"use client"

import * as React from "react";
import { cn } from "@/lib/utils"
import { Button } from "./ui/button";
import { ArrowUpAZ, ArrowDownAZ } from "lucide-react";

export interface SortDescriptor {
  field: string;
  direction: 'asc' | 'desc';
}

interface DataTableColumnHeaderProps {
  title: string;
  columnKey: string;
  sortDescriptors: SortDescriptor[];
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>;
}

export function DataTableColumnHeader({
  title,
  columnKey,
  sortDescriptors,
  setSortDescriptors,
}: DataTableColumnHeaderProps) {
  const currentSort = sortDescriptors.find(s => s.field === columnKey);

  const handleSort = (direction: 'asc' | 'desc') => {
    let newDescriptors: SortDescriptor[];
    
    // Check if the column is already being sorted
    if (currentSort) {
        // If the direction is the same, do nothing (or could reverse, but let's stick to this)
        if (currentSort.direction === direction) {
            newDescriptors = sortDescriptors.filter(s => s.field !== columnKey);
        } else {
            // If direction is different, update it and move to front
            newDescriptors = [
                { field: columnKey, direction },
                ...sortDescriptors.filter(s => s.field !== columnKey)
            ];
        }
    } else {
        // If not sorted, add as primary sort
        newDescriptors = [{ field: columnKey, direction }, ...sortDescriptors];
    }
    
    setSortDescriptors(newDescriptors.slice(0, 3)); // Limit to 3 sort levels
  };

  const handleHeaderClick = () => {
    // Default to 'asc' if not sorted, otherwise toggle
    handleSort(currentSort?.direction === 'asc' ? 'desc' : 'asc');
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleHeaderClick}
        className="-ml-4 h-8 data-[state=open]:bg-accent"
      >
        <span>{title}</span>
        {currentSort?.direction === "asc" && (
          <ArrowUpAZ className="ml-2 h-4 w-4" />
        )}
        {currentSort?.direction === "desc" && (
          <ArrowDownAZ className="ml-2 h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
