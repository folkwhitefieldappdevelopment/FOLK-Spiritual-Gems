
"use client";

import * as React from "react";
import type { Person, Group } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type ManageGroupMembersDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (memberIds: string[]) => void;
  group: Group;
  allPeople: Person[];
};

export function ManageGroupMembersDialog({
  isOpen,
  setIsOpen,
  onSave,
  group,
  allPeople,
}: ManageGroupMembersDialogProps) {
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (isOpen) {
      setSelectedMemberIds(new Set(group.peopleIds));
    }
  }, [isOpen, group.peopleIds]);

  const handleMemberSelect = (personId: string, isSelected: boolean) => {
    const newSet = new Set(selectedMemberIds);
    if (isSelected) {
      newSet.add(personId);
    } else {
      newSet.delete(personId);
    }
    setSelectedMemberIds(newSet);
  };

  const handleSave = () => {
    onSave(Array.from(selectedMemberIds));
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
          <DialogDescription>
            Select the contacts you want to add to the '{group.name}' group.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4 space-y-4">
              {allPeople.length > 0 ? (
                allPeople.map((person) => (
                  <div key={person.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`person-${person.id}`}
                      checked={selectedMemberIds.has(person.id)}
                      onCheckedChange={(checked) =>
                        handleMemberSelect(person.id, !!checked)
                      }
                    />
                    <Avatar className="h-8 w-8">
                       <AvatarImage
                          src={person.photoUrl}
                          alt={`${person.firstName} ${person.lastName}`}
                        />
                       <AvatarFallback>
                          {person.firstName.charAt(0)}
                          {person.lastName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor={`person-${person.id}`}
                      className="text-sm font-medium leading-none"
                    >
                      {person.firstName} {person.lastName}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  No contacts available to add.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Members</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
