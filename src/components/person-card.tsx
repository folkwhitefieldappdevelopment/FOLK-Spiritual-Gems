"use client";

import Image from "next/image";
import { MoreHorizontal, Mail, Phone, MapPin, Trash2, Edit } from "lucide-react";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PersonCardProps = {
  person: Person;
};

const statusColors = {
  Active: "bg-green-500",
  Inactive: "bg-red-500",
  Pending: "bg-yellow-500",
};

export function PersonCard({ person }: PersonCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} data-ai-hint="person portrait" />
          <AvatarFallback>
            {person.firstName.charAt(0)}
            {person.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl">
            {person.firstName} {person.lastName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", statusColors[person.status])} />
            <CardDescription>{person.status}</CardDescription>
          </div>
        </div>
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
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
         <div className="flex items-center text-sm text-muted-foreground">
           <Mail className="mr-2 h-4 w-4" />
           <span>{person.email}</span>
         </div>
         <div className="flex items-center text-sm text-muted-foreground">
           <Phone className="mr-2 h-4 w-4" />
           <span>{person.phone}</span>
         </div>
         <div className="flex items-center text-sm text-muted-foreground">
           <MapPin className="mr-2 h-4 w-4" />
           <span>{person.location}</span>
         </div>
         {person.checklist && person.checklist.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
             <h4 className="text-sm font-semibold text-foreground mb-1">Contact Progress</h4>
            {person.checklist.map((item) => (
              <div key={item.id} className="flex items-center text-sm">
                <span className={cn(
                  "h-2 w-2 rounded-full mr-2 shrink-0",
                  item.isChecked ? "bg-green-500" : "bg-red-500"
                )} />
                <span className={cn(
                  item.isChecked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.statement}
                </span>
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
