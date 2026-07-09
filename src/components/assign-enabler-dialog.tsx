
"use client";

import * as React from "react";
import { getAssignableUsersForAssignments } from "@/services/user-service";
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
import { Loader2, UserPlus } from "lucide-react";
import { useAppToast } from '@/contexts/toast-context';
import { useAuth } from "@/contexts/auth-context";

type AssignEnablerDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (enabler: AppUser) => void;
  peopleCount: number;
};

export function AssignEnablerDialog({
  isOpen,
  setIsOpen,
  onSave,
  peopleCount,
}: AssignEnablerDialogProps) {
  const { toast } = useAppToast();
  const { appUser } = useAuth();
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEnablerId, setSelectedEnablerId] = React.useState<string>("");

  React.useEffect(() => {
    if (!isOpen || !appUser) return;
    
    const fetchEnablers = async () => {
        setIsLoading(true);
        try {
            const assignableUsers = await getAssignableUsersForAssignments(appUser);
            setEnablers(assignableUsers.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to fetch enablers", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load list of enablers.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchEnablers();
  }, [isOpen, toast, appUser]);

  const handleSave = () => {
    const selectedEnabler = enablers.find(h => h.id === selectedEnablerId);
    if (selectedEnabler) {
        onSave(selectedEnabler);
    }
    setIsOpen(false);
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedEnablerId("");
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Enabler
          </DialogTitle>
          <DialogDescription>
            Reassign the {peopleCount} selected contacts to a different enabler.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    <Select value={selectedEnablerId} onValueChange={setSelectedEnablerId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an enabler..." />
                        </SelectTrigger>
                        <SelectContent>
                            {enablers.length > 0 ? (
                                enablers.map(enabler => (
                                    <SelectItem key={enabler.id} value={enabler.id}>
                                        {enabler.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="p-2 text-center text-sm text-muted-foreground">No enablers found.</div>
                            )}
                        </SelectContent>
                    </Select>
                    {enablers.length === 0 && !isLoading && (
                        <p className="text-xs text-muted-foreground italic">You don't have any enablers reporting to you to assign these contacts to.</p>
                    )}
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !selectedEnablerId}>Confirm Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
