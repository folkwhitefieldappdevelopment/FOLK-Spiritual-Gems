
"use client"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDown,
  EyeOff,
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

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: { id: string; getIsSorted: () => 'asc' | 'desc' | false, toggleSorting: (desc?: boolean) => void }
  title: string
  sortDescriptors: SortDescriptor[]
  setSortDescriptors: React.Dispatch<React.SetStateAction<SortDescriptor[]>>
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  sortDescriptors,
  setSortDescriptors
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

  const clearSort = () => {
    const newDescriptors = sortDescriptors.filter(d => d.field !== column.id);
    if (newDescriptors.length === 0) {
      setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
    } else {
      setSortDescriptors(newDescriptors);
    }
  }

  const sortedState = column.getIsSorted();

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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => clearSort()}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
