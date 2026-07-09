
"use client";

import * as React from "react";
import type { Person, Group } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { getPeople } from "@/services/people-service";
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
import { Input } from "./ui/input";
import { Search, Loader2 } from "lucide-react";

type ManageGroupMembersDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (memberIds: string[]) => void;
  group: Group;
};

export function ManageGroupMembersDialog({
  isOpen,
  setIsOpen,
  onSave,
  group,
}: ManageGroupMembersDialogProps) {
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { appUser } = useAuth();

  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    if (isOpen && appUser) {
      setIsLoading(true);
      getPeople(appUser).then(data => {
        setAllPeople(data.people);
        setIsLoading(false);
      });
      setSelectedMemberIds(new Set(group.peopleIds));
      setSearchTerm("");
    }
  }, [isOpen, group.peopleIds, appUser]);

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

  const filteredPeople = React.useMemo(() => {
    return allPeople.filter(person => {
      const name = (person.fullName || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase())
    }).sort((a,b) => a.fullName.localeCompare(b.fullName));
  }, [allPeople, searchTerm]);

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
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-72 w-full rounded-md border">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
                <div className="p-4 space-y-4">
                {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => {
                    const fullName = person.fullName || '';
                    const nameParts = fullName.split(' ');
                    const fallback = (
                        `${nameParts[0]?.charAt(0) || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) || '' : ''}`
                    ).toUpperCase();

                    return (
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
                                alt={fullName}
                            />
                            <AvatarFallback>
                                {fallback}
                            </AvatarFallback>
                        </Avatar>
                        <Label
                            htmlFor={`person-${person.id}`}
                            className="text-sm font-medium leading-none"
                        >
                            {fullName}
                        </Label>
                        </div>
                    );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">
                    {allPeople.length === 0 ? "No contacts available to add." : "No contacts found."}
                    </p>
                )}
                </div>
            )}
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
