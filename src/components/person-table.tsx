
"use client";

import Link from 'next/link';
import { MoreHorizontal, Phone, Calendar, Edit, Trash2, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { Person } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type PersonTableProps = {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
  isCallingAssistantView?: boolean;
};

const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate(); // Firestore Timestamp
    if (timestamp instanceof Date) return timestamp; // Javascript Date
    return null;
}

export function PersonTable({ people, onEdit, onDelete, isCallingAssistantView = false }: PersonTableProps) {
  return (
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              {isCallingAssistantView ? (
                <>
                  <TableHead className="hidden md:table-cell">Event</TableHead>
                  <TableHead>Call Status</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="hidden md:table-cell">Last Called</TableHead>
                  <TableHead>Last Remark</TableHead>
                </>
              )}
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <Link href={`/contacts/${person.id}`} className="flex items-center gap-3 group">
                    <Avatar>
                      <AvatarImage
                        src={person.photoUrl}
                        alt={`${person.firstName} ${person.lastName}`}
                        data-ai-hint="person portrait"
                      />
                      <AvatarFallback>
                        {person.firstName.charAt(0)}
                        {person.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium group-hover:underline">
                      {person.firstName} {person.lastName}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4 shrink-0" />
                    {person.phone}
                  </a>
                </TableCell>
                
                {isCallingAssistantView ? (
                   <>
                    <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="truncate">{person.lastCallEvent || 'N/A'}</span>
                        </span>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">{person.lastCallStatus || 'Not Called'}</span>
                          </span>
                        </TooltipTrigger>
                        {person.lastCallStatus && <TooltipContent><p>{person.lastCallStatus}</p></TooltipContent>}
                      </Tooltip>
                    </TableCell>
                  </>
                ) : (
                   <>
                    <TableCell className="hidden md:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 shrink-0" />
                              {person.lastCallAt ? 
                                    `${formatDistanceToNow(safeDate(person.lastCallAt)!, { addSuffix: true })}` 
                                    : 'Never'
                                }
                            </span>
                          </TooltipTrigger>
                          {person.lastCallAt && (
                            <TooltipContent>
                                <p>{safeDate(person.lastCallAt)!.toLocaleString()}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4 shrink-0" />
                              <span className="truncate">{person.lastCallRemark || 'No remarks yet'}</span>
                            </span>
                          </TooltipTrigger>
                          {person.lastCallRemark && (
                            <TooltipContent>
                                <p className="max-w-xs">{person.lastCallRemark}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                    </TableCell>
                   </>
                )}
                
                <TableCell className="text-right">
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(person)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {isCallingAssistantView ? 'View/Edit Details' : 'Edit'}
                        </DropdownMenuItem>
                        {!isCallingAssistantView && (
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-start px-2 py-1.5 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete {person.firstName} {person.lastName}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(person.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
