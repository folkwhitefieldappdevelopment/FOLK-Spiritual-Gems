"use client";
import Link from "next/link";
import * as React from 'react';
import { Users, MoreHorizontal, Edit, Trash2, PhoneCall, User, Clock } from "lucide-react";
import type { Group } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { getUserById } from "@/services/user-service";
import Image from "next/image";
import { format } from "date-fns";
import { safeDate } from "@/utils/date";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

type GroupCardProps = {
  group: Group & { filteredMemberCount?: number };
  onEdit: () => void;
  onDelete: () => void;
  onStartCall: () => void;
  ownerName?: string;
  displayMemberCount?: number;
  totalMemberCount?: number;
};

const GroupCardComponent = ({ group, onEdit, onDelete, onStartCall, ownerName, displayMemberCount, totalMemberCount }: GroupCardProps) => {
  const { appUser } = useAuth();
  const [fetchedOwnerName, setFetchedOwnerName] = React.useState<string | null>(null);
  const [isFetchingOwner, setIsFetchingOwner] = React.useState(false);
  const fetchedRef = React.useRef(false);

  const isCreator = React.useMemo(() => {
    if (!appUser?.id) return false;
    const myNameLower = (appUser.name || '').toLowerCase();
    const creatorNameLower = (group.createdByName || '').toLowerCase();
    return group.createdBy === appUser.id || creatorNameLower === myNameLower;
  }, [group, appUser]);
  
  const resolvedName = isCreator 
    ? "Me" 
    : (group.createdByName || ownerName || group.assignedToName || fetchedOwnerName || "System");

  React.useEffect(() => {
    if (!isCreator && group.createdBy && !group.createdByName && !fetchedRef.current) {
        fetchedRef.current = true;
        setIsFetchingOwner(true);
        getUserById(group.createdBy).then(user => {
            if (user) setFetchedOwnerName(user.name);
        }).finally(() => {
            setIsFetchingOwner(false);
        });
    }
  }, [group.createdBy, isCreator, group.createdByName]);

  const handleCallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartCall();
  };

  const memberCount = displayMemberCount ?? group.memberCount;
  const showTotal = typeof totalMemberCount !== 'undefined' && totalMemberCount !== memberCount && !group.isDynamic;

  return (
    <Card className="flex flex-col h-full transition-all hover:shadow-lg relative overflow-hidden group/card bg-card border-primary/10">
      <div className="relative h-32 w-full overflow-hidden bg-muted/20">
        {group.photoUrl ? (
          <Image 
            src={group.photoUrl} 
            alt={group.name} 
            fill 
            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Users className="h-16 w-16" />
          </div>
        )}
        <div className={cn("absolute inset-0 opacity-20", group.color)} />
        
        <div className="absolute top-2 right-2 flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 bg-background/80 backdrop-blur hover:bg-background border shadow-sm" 
                        onClick={handleCallClick}
                      >
                        <PhoneCall className="h-4 w-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="font-bold">Start Calling Session</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {!group.isDynamic && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-background/80 backdrop-blur hover:bg-background border shadow-sm"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive font-bold"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Group
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the group '{group.name}'. Contact records will not be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </div>

      <CardHeader className="pt-4 px-4 pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/groups/details?id=${group.id}`} className="block w-full">
            <CardTitle className="hover:underline text-lg font-black tracking-tight line-clamp-1">{group.name}</CardTitle>
          </Link>
        </div>
        <CardDescription className="line-clamp-2 text-[11px] leading-relaxed min-h-[32px]">
            {group.task ? (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-primary uppercase text-[9px] tracking-tight">Task: {group.task}</span>
                    <span className="text-muted-foreground">Assigned by {group.assignedByName}</span>
                    <div className="flex items-center gap-1 text-orange-500 font-black">
                        <Clock className="h-2.5 w-2.5" />
                        Expires {group.expiresAt ? format(safeDate(group.expiresAt)!, 'dd MMM, p') : 'Never'}
                    </div>
                </div>
            ) : (
                group.description || "No description provided."
            )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow px-4 pb-2"></CardContent>

      <CardFooter className="flex justify-between items-center gap-4 px-4 pb-4 pt-0 mt-auto">
        <div className="flex flex-col gap-1 items-start text-[10px] text-muted-foreground min-w-0">
            <div className="flex items-center">
                <Users className="mr-1.5 h-3 w-3 shrink-0" />
                <span className="font-bold">
                  {group.isDynamic ? (
                      `${memberCount} members`
                  ) : (
                    showTotal ? `${memberCount} of ${totalMemberCount}` : `${memberCount} member${memberCount !== 1 ? "s" : ""}`
                  )}
                </span>
            </div>
            {!group.isDynamic && (
                <div className="flex items-center cursor-default max-w-full">
                    <User className="mr-1.5 h-3 w-3 shrink-0" />
                    <span className="truncate">
                        Belongs to: <span className={cn("font-bold", isCreator ? "text-primary" : "text-foreground/80")}>
                            {isFetchingOwner && !resolvedName ? "..." : (resolvedName || "System")}
                        </span>
                    </span>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
            {group.isDynamic ? (
              <Badge variant="outline" className="flex items-center gap-1 px-1.5 h-5 text-[9px] bg-primary/5 text-primary border-primary/20 font-bold">
                <Users className="h-3 w-3" />
                Auto
              </Badge>
            ) : group.visibility?.length > 0 ? (
              <div className="flex -space-x-1">
                {group.visibility.map(role => (
                    <Badge key={role} variant="outline" className="px-1.5 h-5 text-[8px] uppercase tracking-tighter bg-accent/5 text-accent-foreground border-accent/20 font-black">
                        {role.split(' ')[1] || role}
                    </Badge>
                ))}
              </div>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1 px-1.5 h-5 text-[9px] font-bold">
                <Users className="h-3 w-3" />
                Private
              </Badge>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}

export const GroupCard = React.memo(GroupCardComponent);
