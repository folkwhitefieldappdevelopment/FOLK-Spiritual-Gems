"use client";

import * as React from "react";
import { getAssignableUsersForAssignments } from "@/services/user-service";
import { assignCoEnablerSession } from "@/services/people-service";
import { createGroup } from "@/services/groups-service";
import type { AppUser, CoEnablerSession } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link, Users, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { format, addHours } from "date-fns";

type AssignCoEnablerDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (coEnabler: AppUser | null) => void;
  peopleCount: number;
  selectedPersonIds?: string[];
};

export function AssignCoEnablerDialog({
  isOpen,
  setIsOpen,
  onSave,
  peopleCount,
  selectedPersonIds = [],
}: AssignCoEnablerDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [activeTab, setActiveTab] = React.useState<'system' | 'external'>('system');
  const [coEnablers, setCoEnablers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [selectedCoEnablerId, setSelectedCoEnablerId] = React.useState<string>("");
  const [externalName, setExternalName] = React.useState("");
  const [taskName, setTaskName] = React.useState("");
  const [duration, setDuration] = React.useState("24"); // Hours
  
  const [generatedLink, setGeneratedLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !appUser) return;
    
    const fetchCoEnablers = async () => {
        setIsLoading(true);
        try {
            const availableCoEnablers = await getAssignableUsersForAssignments(appUser);
            setCoEnablers(availableCoEnablers.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load list of enablers.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchCoEnablers();
    setGeneratedLink("");
    setExternalName("");
    setTaskName("");
    setSelectedCoEnablerId("");
  }, [isOpen, toast, appUser]);

  const handleSaveSystem = async () => {
    if (selectedCoEnablerId === '__UNASSIGN__') {
        onSave(null);
        setIsOpen(false);
        return;
    }

    const enabler = coEnablers.find(u => u.id === selectedCoEnablerId);
    if (!enabler || !appUser || !taskName) return;

    setIsSaving(true);
    try {
        const expiryDate = addHours(new Date(), parseInt(duration));
        const expiryStr = format(expiryDate, 'dd MMM p');
        
        const groupName = `${appUser.name} - ${taskName} - ${expiryStr}`;
        
        await createGroup({
            name: groupName,
            description: `Assigned by ${appUser.name}. Expires: ${expiryDate.toISOString()}`,
            expiresAt: expiryDate.toISOString(),
            peopleIds: selectedPersonIds,
            memberCount: selectedPersonIds.length,
            createdBy: appUser.id, 
            createdByName: appUser.name,
            sharedWithUserIds: [enabler.id], 
            visibility: [], 
            task: taskName, 
            assignedBy: appUser.id, 
            assignedByName: appUser.name,
        }, { id: appUser.id, name: appUser.name, role: appUser.role });

        await onSave(enabler);
        toast({ title: 'Assignment Successful', description: `Group "${groupName}" created for ${enabler.name}.` });
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Assignment Failed' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!externalName || !taskName || !appUser) return;

    setIsSaving(true);
    try {
        const expiresAt = addHours(new Date(), parseInt(duration)).toISOString();
        const sessionData: Omit<CoEnablerSession, 'id'> = {
            name: externalName,
            task: taskName,
            type: 'external',
            expiresAt,
            peopleIds: selectedPersonIds,
            creatorId: appUser.id,
            creatorName: appUser.name
        };

        const sessionId = await assignCoEnablerSession(selectedPersonIds, sessionData, appUser);
        const origin = window.location.origin;
        setGeneratedLink(`${origin}/co-enabler?id=${sessionId}`);
        toast({ title: 'Link Generated' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Failed to generate link' });
    } finally {
        setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(generatedLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast({ variant: 'destructive', title: "Copy Failed", description: "Clipboard access restricted." });
        });
    } catch (e) {
      toast({ variant: 'destructive', title: "Copy Failed" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Users className="h-6 w-6 text-primary" />
            ASSIGN TASK
          </DialogTitle>
          <DialogDescription>
            Delegate {peopleCount} contacts for focused calling.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="py-2">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 h-11 rounded-xl">
              <TabsTrigger value="system" className="font-bold data-[state=active]:bg-background rounded-lg">Team Member</TabsTrigger>
              <TabsTrigger value="external" className="font-bold data-[state=active]:bg-background rounded-lg">External Link</TabsTrigger>
            </TabsList>
            
            <TabsContent value="system" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Assignee</Label>
                    <Select value={selectedCoEnablerId} onValueChange={setSelectedCoEnablerId}>
                        <SelectTrigger className="h-11 border-2 font-bold">
                            <SelectValue placeholder="Pick a team member..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__UNASSIGN__" className="text-destructive font-bold">Unassign Current</SelectItem>
                            {coEnablers.map(u => (
                                <SelectItem key={u.id} value={u.id} className="font-medium">{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </TabsContent>

            <TabsContent value="external" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volunteer Name</Label>
                    <Input placeholder="e.g. Sarthak (External)" value={externalName} onChange={e => setExternalName(e.target.value)} className="h-11 border-2 font-bold" />
                </div>
            </TabsContent>

            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Task / Occasion</Label>
                    <Input placeholder="e.g. Janmashtami Invitations" value={taskName} onChange={e => setTaskName(e.target.value)} className="h-11 border-2 font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Access Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="4" className="font-medium">4 Hours</SelectItem>
                            <SelectItem value="12" className="font-medium">12 Hours</SelectItem>
                            <SelectItem value="24" className="font-medium font-bold">24 Hours (1 Day)</SelectItem>
                            <SelectItem value="48" className="font-medium">48 Hours (2 Days)</SelectItem>
                            <SelectItem value="168" className="font-medium">1 Week</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </Tabs>
        ) : (
          <div className="py-8 space-y-4 text-center">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-2 animate-bounce-subtle">
                <Link className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-1">
                <h3 className="font-black text-lg">Link Ready!</h3>
                <p className="text-xs text-muted-foreground">Share this with {externalName}. It will expire in {duration} hours.</p>
            </div>
            <div className="flex gap-2 p-2 bg-muted rounded-xl border-2">
                <Input value={generatedLink} readOnly className="bg-transparent border-none text-xs font-mono" />
                <Button size="icon" variant="ghost" onClick={copyToClipboard} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!generatedLink ? (
            <>
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold">Cancel</Button>
                {activeTab === 'system' ? (
                    <Button onClick={handleSaveSystem} disabled={isLoading || isSaving || !selectedCoEnablerId || (selectedCoEnablerId !== '__UNASSIGN__' && !taskName)} className="font-black px-6">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Assign Team Member
                    </Button>
                ) : (
                    <Button onClick={handleGenerateLink} disabled={isSaving || !externalName || !taskName} className="font-black px-6">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                        Generate Link
                    </Button>
                )}
            </>
          ) : (
            <Button className="w-full font-black rounded-xl h-11" onClick={() => setIsOpen(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
