"use client";

import Image from "next/image";
import { MoreHorizontal, Mail, Phone, MapPin, Trash2, Edit } from "lucide-react";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type PersonTableProps = {
  people: Person[];
};

const statusBadgeVariants = {
    Active: "default",
    Inactive: "destructive",
    Pending: "secondary",
} as const;


export function PersonTable({ people }: PersonTableProps) {
  return (
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} data-ai-hint="person portrait" />
                      <AvatarFallback>
                        {person.firstName.charAt(0)}
                        {person.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {person.firstName} {person.lastName}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariants[person.status] || 'default'}>{person.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{person.email}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      {person.phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {person.location}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
