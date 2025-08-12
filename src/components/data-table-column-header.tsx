
"use client"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDown,
  EyeOff,
  Filter as FilterIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SortDescriptor } from "./sort-popover"
import { DataTableFilter, type Filter } from "./data-table-filter"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: { 
      id: string; 
      getIsSorted: () => 'asc' | 'desc' | false, 
      toggleSorting: (desc?: boolean) => void 
  }
  title: string
  sortDescriptors: SortDescriptor[]
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>
  filter?: Filter
  onFilterChange?: (filter: Filter | undefined) => void
  allValues?: (string | number)[]
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  sortDescriptors,
  setSortDescriptors,
  filter,
  onFilterChange,
  allValues,
}: DataTableColumnHeaderProps<TData, TValue>) {
  
  const handleSort = (direction: 'asc' | 'desc') => {
    // If it's already sorted by this column, just toggle direction
    const existingSortIndex = sortDescriptors.findIndex(d => d.field === column.id);
    if (existingSortIndex > -1) {
      const newDescriptors = [...sortDescriptors];
      newDescriptors[existingSortIndex].direction = direction;
      setSortDescriptors(newDescriptors);
    } else {
      // Add new sort, but remove the default 'createdAt' if it exists
      const filtered = sortDescriptors.filter(d => d.field !== 'createdAt');
      setSortDescriptors([...filtered, { field: column.id, direction }]);
    }
  }

  const sortedState = column.getIsSorted();

  if (onFilterChange && allValues) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <DataTableFilter
          columnName={title}
          allValues={allValues}
          filter={filter}
          onFilterChange={onFilterChange}
          onSort={handleSort}
        />
        {sortedState === "desc" ? (
          <ArrowDownIcon className="h-3 w-3 text-muted-foreground" />
        ) : sortedState === "asc" ? (
          <ArrowUpIcon className="h-3 w-3 text-muted-foreground" />
        ) : null}
      </div>
    )
  }

  // Fallback to simple sort-only dropdown if no filter props are provided
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {sortedState === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : sortedState === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleSort("asc")}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSort("desc")}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
