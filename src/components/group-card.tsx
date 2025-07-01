"use client";
import Link from "next/link";
import { Users, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { Group } from "@/lib/types";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

type GroupCardProps = {
  group: Group;
  onEdit: () => void;
  onDelete: () => void;
};

export function GroupCard({ group, onEdit, onDelete }: GroupCardProps) {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  return (
    <Link href={`/groups/${group.id}`} className="block h-full">
      <Card className="flex flex-col h-full transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{group.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-2"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.preventDefault()}
              >
                <DropdownMenuItem onClick={() => onEdit()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-2 py-1.5 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive relative"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the group '{group.name}'.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete()}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="line-clamp-2">
            {group.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow"></CardContent>
        <CardFooter>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            <span>
              {group.memberCount} member{group.memberCount !== 1 && "s"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
