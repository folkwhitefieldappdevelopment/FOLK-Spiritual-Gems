
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

type AssignCoEnablerDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (coEnabler: AppUser | null) => void;
  peopleCount: number;
};

export function AssignCoEnablerDialog({
  isOpen,
  setIsOpen,
  onSave,
  peopleCount,
}: AssignCoEnablerDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [coEnablers, setCoEnablers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCoEnablerId, setSelectedCoEnablerId] = React.useState<string>("");

  React.useEffect(() => {
    if (!isOpen || !appUser) return;
    
    const fetchCoEnablers = async () => {
        setIsLoading(true);
        try {
            let availableCoEnablers: AppUser[] = [];
            if (appUser.role.includes('Admin')) {
                const allUsers = await getUsers();
                availableCoEnablers = allUsers.filter(u => u.role.includes('Folk Enabler'));
            } else if (appUser.role.includes('Folk Guide')) {
                availableCoEnablers = await getEnablersForGuide(appUser.id);
            }
            setCoEnablers(availableCoEnablers.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to fetch co-enablers", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load list of co-enablers.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchCoEnablers();
  }, [isOpen, appUser, toast]);

  const handleSave = () => {
    if (selectedCoEnablerId === '__UNASSIGN__') {
        onSave(null);
    } else {
        const selectedCoEnabler = coEnablers.find(h => h.id === selectedCoEnablerId);
        if (selectedCoEnabler) {
            onSave(selectedCoEnabler);
        }
    }
    setIsOpen(false);
  };
  
  // Reset state when closing
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedCoEnablerId("");
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Co-Enabler</DialogTitle>
          <DialogDescription>
            Temporarily assign the {peopleCount} selected contacts to a co-enabler for calling.
            This does not change their permanent enabler.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : (
                <Select value={selectedCoEnablerId} onValueChange={setSelectedCoEnablerId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a co-enabler..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__UNASSIGN__">Unassign Co-Enabler</SelectItem>
                        {coEnablers.map(coEnabler => (
                            <SelectItem key={coEnabler.id} value={coEnabler.id}>
                                {coEnabler.name}
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
          <Button onClick={handleSave} disabled={isLoading || !selectedCoEnablerId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
