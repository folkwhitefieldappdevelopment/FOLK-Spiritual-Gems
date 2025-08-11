
"use client";

import * as React from "react";
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
  const { toast } = useToast();
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEnablerId, setSelectedEnablerId] = React.useState<string>("");

  React.useEffect(() => {
    if (!isOpen) return;
    
    const fetchEnablers = async () => {
        setIsLoading(true);
        try {
            const allUsers = await getUsers();
            const availableEnablers = allUsers.filter(u => u.role.includes('Folk Enabler'));
            setEnablers(availableEnablers.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to fetch enablers", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load list of enablers.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchEnablers();
  }, [isOpen, toast]);

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
          <DialogTitle>Assign Enabler</DialogTitle>
          <DialogDescription>
            Assign the {peopleCount} selected contacts to an enabler.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : (
                <Select value={selectedEnablerId} onValueChange={setSelectedEnablerId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an enabler..." />
                    </SelectTrigger>
                    <SelectContent>
                        {enablers.map(enabler => (
                            <SelectItem key={enabler.id} value={enabler.id}>
                                {enabler.name}
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
          <Button onClick={handleSave} disabled={isLoading || !selectedEnablerId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
