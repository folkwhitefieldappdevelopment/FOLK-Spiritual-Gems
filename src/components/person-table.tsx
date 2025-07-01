
"use client";

import Link from 'next/link';
import { MoreHorizontal, Phone, MapPin, Trash2, Edit, Sunrise } from "lucide-react";
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
};

export function PersonTable({ people, onEdit, onDelete }: PersonTableProps) {
  return (
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] sm:w-[250px]">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Native Place</TableHead>
              <TableHead>Chanting Status</TableHead>
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
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    {person.phone}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {person.nativePlace || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                          <Sunrise className="h-4 w-4 shrink-0" />
                          <span className="truncate">{person.chantingStatus || 'N/A'}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{person.chantingStatus || 'N/A'}</p>
                      </TooltipContent>
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
                          Edit
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start px-2 py-1.5 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
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
