"use client";

import * as React from "react";
import { getAssignableUsersForAssignments } from "@/services/user-service";
import { assignCoEnablerSession } from "@/services/people-service";
import { createGroup } from "@/services/groups-service";
import { getExternalCoEnablers } from "@/services/settings-service";
import { sendCoEnablerInviteEmail } from "@/services/mail-service";
import type { AppUser, CoEnablerSession, ExternalCoEnabler } from "@/lib/types";
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
import { Loader2, Link, Users, Copy, Check, MailCheck, Send } from "lucide-react";
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
  
  const isAdminOrFG = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  const [activeTab, setActiveTab] = React.useState<'system' | 'external'>('system');
  
  const [coEnablers, setCoEnablers] = React.useState<AppUser[]>([]);
  const [externals, setExternals] = React.useState<ExternalCoEnabler[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [selectedCoEnablerId, setSelectedCoEnablerId] = React.useState<string>("");
  const [selectedExternalId, setSelectedExternalId] = React.useState<string>("");
  const [taskName, setTaskName] = React.useState("");
  const [duration, setDuration] = React.useState("24"); // Hours
  
  const [inviteSent, setInviteSent] = React.useState(false);
  const [sentToName, setSentToName] = React.useState("");

  React.useEffect(() => {
    if (!isOpen || !appUser) return;
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [availableCoEnablers, externalList] = await Promise.all([
                getAssignableUsersForAssignments(appUser),
                isAdminOrFG ? getExternalCoEnablers() : Promise.resolve([])
            ]);
            setCoEnablers(availableCoEnablers.sort((a,b) => a.name.localeCompare(b.name)));
            setExternals(externalList.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load registry.'});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();
    setInviteSent(false);
    setSentToName("");
    setTaskName("");
    setSelectedCoEnablerId("");
    setSelectedExternalId("");
  }, [isOpen, toast, appUser, isAdminOrFG]);

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

        // Assignment Successful - Refresh parent selection but skip direct person document update
        // to prevent flooding the co-enabler's permanent Contacts tab.
        toast({ title: 'Assignment Successful' });
        setIsOpen(false);
        onSave(null); 
    } catch (e) {
        toast({ variant: 'destructive', title: 'Assignment Failed' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSendExternalInvite = async () => {
    const volunteer = externals.find(v => v.id === selectedExternalId);
    if (!volunteer || !taskName || !appUser) return;

    setIsSaving(true);
    try {
        const expiresAt = addHours(new Date(), parseInt(duration)).toISOString();
        const sessionData: Omit<CoEnablerSession, 'id'> = {
            name: volunteer.name,
            task: taskName,
            type: 'external',
            expiresAt,
            peopleIds: selectedPersonIds,
            creatorId: appUser.id,
            creatorName: appUser.name
        };

        const sessionId = await assignCoEnablerSession(selectedPersonIds, sessionData, appUser);
        const origin = window.location.origin;
        const link = `${origin}/co-enabler?id=${sessionId}`;
        
        await sendCoEnablerInviteEmail(
            volunteer.email,
            volunteer.name,
            taskName,
            link,
            selectedPersonIds.length,
            appUser.name,
            duration
        );

        setSentToName(volunteer.name);
        setInviteSent(true);
        toast({ title: 'Invitation Sent' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Failed to send invite' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-8 pb-4 bg-card border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
            <Users className="h-6 w-6 text-primary" />
            TASK ASSIGNMENT
          </DialogTitle>
          <DialogDescription className="font-bold">
            Delegate <span className="text-primary">{peopleCount}</span> contacts for focused interaction.
          </DialogDescription>
        </DialogHeader>

        {!inviteSent ? (
          <div className="p-8 space-y-6">
            {isAdminOrFG ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted h-12 p-1 rounded-xl gap-1">
                  <TabsTrigger value="system" className="font-black text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-background">Internal Staff</TabsTrigger>
                  <TabsTrigger value="external" className="font-black text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-background">External Registry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="system" className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Assignee</Label>
                        <Select value={selectedCoEnablerId} onValueChange={setSelectedCoEnablerId}>
                            <SelectTrigger className="h-14 border-border bg-muted font-bold rounded-xl px-4">
                                <SelectValue placeholder="Pick a team member..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                <SelectItem value="__UNASSIGN__" className="text-destructive font-bold italic">Unassign / Clear Task</SelectItem>
                                {coEnablers.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="font-medium">{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </TabsContent>

                <TabsContent value="external" className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verified Volunteer</Label>
                        <Select value={selectedExternalId} onValueChange={setSelectedExternalId}>
                            <SelectTrigger className="h-14 border-border bg-muted font-bold rounded-xl px-4">
                                <SelectValue placeholder="Select from registry..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {externals.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="font-medium">{v.name} ({v.email})</SelectItem>
                                ))}
                                {externals.length === 0 && (
                                    <div className="p-4 text-center text-xs italic opacity-50">No volunteers registered in Settings.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </TabsContent>
              </Tabs>
            ) : (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Team Member</Label>
                        <Select value={selectedCoEnablerId} onValueChange={setSelectedCoEnablerId}>
                            <SelectTrigger className="h-14 border-border bg-muted font-bold rounded-xl px-4">
                                <SelectValue placeholder="Pick a team member..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {coEnablers.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="space-y-6 pt-4 border-t border-border">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Interaction Context / Task Name</Label>
                    <Input placeholder="e.g. Sunday Feast Invite, Janmashtami Follow-up" value={taskName} onChange={e => setTaskName(e.target.value)} className="h-14 border-border bg-muted font-black px-5 rounded-xl text-foreground focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Window</Label>
                    <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="h-12 border-border bg-muted font-bold rounded-xl px-4"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            <SelectItem value="4" className="font-medium">4 Hours</SelectItem>
                            <SelectItem value="12" className="font-medium">12 Hours</SelectItem>
                            <SelectItem value="24" className="font-bold text-primary">24 Hours (1 Day)</SelectItem>
                            <SelectItem value="48" className="font-medium">48 Hours (2 Days)</SelectItem>
                            <SelectItem value="168" className="font-medium">1 Week</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
        ) : (
          <div className="p-12 space-y-8 text-center animate-in zoom-in-95 duration-500">
            <div className="mx-auto bg-green-500/10 p-8 rounded-[3rem] w-fit border border-green-500/20 shadow-inner">
                <MailCheck className="h-16 w-16 text-green-500" />
            </div>
            <div className="space-y-2">
                <h3 className="font-black text-2xl uppercase tracking-tight">Assignment Sent! ✨</h3>
                <p className="text-sm text-muted-foreground font-bold px-4 leading-relaxed">The secure interaction link has been dispatched to <span className="text-primary">{sentToName}'s</span> email.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-2xl border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Volunteer access will expire in {duration} hours.
            </div>
          </div>
        )}

        <DialogFooter className="p-8 border-t border-border bg-card gap-3">
          {!inviteSent ? (
            <>
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold text-muted-foreground">Cancel</Button>
                {activeTab === 'system' ? (
                    <Button onClick={handleSaveSystem} disabled={isLoading || isSaving || !selectedCoEnablerId || (selectedCoEnablerId !== '__UNASSIGN__' && !taskName)} className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Finalize Assignment
                    </Button>
                ) : (
                    <Button onClick={handleSendExternalInvite} disabled={isSaving || !selectedExternalId || !taskName} className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Dispatch Invitation
                    </Button>
                )}
            </>
          ) : (
            <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary shadow-xl" onClick={() => setIsOpen(false)}>Return to Outreach</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
