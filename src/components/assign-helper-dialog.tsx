
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { getUsers, getEnablersForGuide } from "@/services/user-service";
import type { AppUser } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AssignHelperDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (helper: AppUser | null) => void;
  peopleCount: number;
};

export function AssignHelperDialog({
  isOpen,
  setIsOpen,
  onSave,
  peopleCount,
}: AssignHelperDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [helpers, setHelpers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedHelperId, setSelectedHelperId] = React.useState<string>("");

  React.useEffect(() => {
    if (!isOpen || !appUser) return;
    
    const fetchHelpers = async () => {
        setIsLoading(true);
        try {
            let availableHelpers: AppUser[] = [];
            if (appUser.role.includes('Admin')) {
                const allUsers = await getUsers();
                availableHelpers = allUsers.filter(u => u.role.includes('Folk Enabler'));
            } else if (appUser.role.includes('Folk Guide')) {
                availableHelpers = await getEnablersForGuide(appUser.id);
            }
            setHelpers(availableHelpers.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to fetch helpers", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load list of helpers.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchHelpers();
  }, [isOpen, appUser, toast]);

  const handleSave = () => {
    if (selectedHelperId === '__UNASSIGN__') {
        onSave(null);
    } else {
        const selectedHelper = helpers.find(h => h.id === selectedHelperId);
        if (selectedHelper) {
            onSave(selectedHelper);
        }
    }
    setIsOpen(false);
  };
  
  // Reset state when closing
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedHelperId("");
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Calling Helper</DialogTitle>
          <DialogDescription>
            Temporarily assign the {peopleCount} selected contacts to a helper for calling.
            This does not change their permanent enabler.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : (
                <Select value={selectedHelperId} onValueChange={setSelectedHelperId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a helper..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__UNASSIGN__">Unassign Helper</SelectItem>
                        {helpers.map(helper => (
                            <SelectItem key={helper.id} value={helper.id}>
                                {helper.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !selectedHelperId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
