
"use client";

import Link from 'next/link';
import { MoreHorizontal, Phone, Edit, Trash2, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
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
                <TableHead>Call Status</TableHead>
              ) : (
                <TableHead className="hidden md:table-cell">Last Called</TableHead>
              )}
              <TableHead>Last Remark</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const nameParts = person.fullName.split(" ");
              const fallback = nameParts.length > 1 
                ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}` 
                : person.fullName.substring(0, 2);

              return (
              <TableRow key={person.id}>
                <TableCell>
                  <Link href={`/contacts/${person.id}`} className="flex items-center gap-3 group">
                    <Avatar>
                      <AvatarImage
                        src={person.photoUrl}
                        alt={person.fullName}
                        data-ai-hint="person portrait"
                      />
                      <AvatarFallback>
                        {fallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium group-hover:underline">
                      {person.fullName}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-3">
                    <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4 shrink-0" />
                      {person.phone}
                    </a>
                     <a href={`https://wa.me/91${person.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp chat">
                        <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 fill-current text-green-600 hover:opacity-80 transition-opacity"
                        >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                    </a>
                  </div>
                </TableCell>
                
                {isCallingAssistantView ? (
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
                ) : (
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
                )}
                
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
                          delete {person.fullName}.
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
            )})}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
