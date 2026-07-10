'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Users,
  RefreshCw,
  Trash2,
  Wrench,
  QrCode,
  CalendarDays,
  Edit,
  CalendarCheck,
  Zap,
  Search,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import type { Person, Group, GroupEvent } from '@/lib/types';
import { useAppToast } from '@/contexts/toast-context';
import { getGroup, deleteGroup as deleteGroupSvc, updateGroup as updateGroupSvc } from '@/services/groups-service';
import { 
  getPeople, 
  updatePerson, 
  deletePerson, 
  getCachedPeople,
  restorePerson,
} from '@/services/people-service';
import { getGroupEvents, markAttendance } from '@/services/attendance-service';
import { useAuth } from '@/contexts/auth-context';
import { updateUser } from '@/services/user-service';
import { trackSessionStart } from '@/services/session-history-service';
import { dynamicGroupDefinitions } from '@/lib/dynamic-groups';
import { Button } from '@/components/ui/button';
import { PersonTable } from '@/components/person-table';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { FreshLeadQRDialog } from '@/components/fresh-lead-qr-dialog';
import { ContactGalleryDialog } from '@/components/contact-gallery-dialog';
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { AddMembersToGroupDialog } from '@/components/add-members-to-group-dialog';
import { CreateEventDialog } from '@/components/create-event-dialog';
import { IntelligentReportView } from '@/components/intelligent-report-view';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export default function GroupDetailClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();

  const [activeTab, setActiveTab] = React.useState('members');
  const [isLoading, setIsLoading] = React.useState(true);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [members, setMembers] = React.useState<Person[]>([]);
  const [totalCount, setTotalCount] = React.useState<number | null>(0);
  const [events, setEvents] = React.useState<GroupEvent[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [markingEvent, setMarkingEvent] = React.useState<GroupEvent | null>(null);
  const [attendanceMembers, setAttendanceMembers] = React.useState<Person[]>([]);
  const [isViewingAttendanceLoading, setIsViewingAttendanceLoading] = React.useState(false);
  const [isPersonDialogOpen, setIsPersonDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = React.useState(false);
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = React.useState(false);
  const [isGroupEditDialogOpen, setIsGroupEditDialogOpen] = React.useState(false);
  const [isEventCreateOpen, setIsEventCreateOpen] = React.useState(false);
  const [qrEvent, setQrEvent] = React.useState<{ id: string, name: string } | null>(null);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = React.useState('');

  const fetchData = React.useCallback(async () => {
    if (!groupId || !appUser) return;
    setIsLoading(true);
    try {
      if (groupId.startsWith('dynamic-')) {
          const def = dynamicGroupDefinitions.find(d => d.id === groupId);
          if (!def) { router.push('/groups'); return; }
          const allPeople = await getCachedPeople();
          const matchingPeople = allPeople.filter(def.filter);
          const syntheticGroup: Group = {
            id: def.id,
            name: def.name,
            description: def.description,
            isDynamic: true,
            peopleIds: matchingPeople.map(p => p.id),
            memberCount: matchingPeople.length,
            photoUrl: '',
            createdBy: 'system',
            createdByName: 'System',
            creatorRole: ['Admin'],
            sharedWithUserIds: [],
            visibility: []
          };
          setGroup(syntheticGroup);
          setMembers(matchingPeople);
          setTotalCount(matchingPeople.length);
          setEvents([]);
      } else {
          const [g, eventsData] = await Promise.all([ getGroup(groupId, appUser), getGroupEvents(groupId) ]);
          if (!g) { router.push('/groups'); return; }
          setGroup(g); setEvents(eventsData);
          const membersResult = await getPeople(appUser, { groupId: g.id, ignoreLimit: true });
          setMembers(membersResult.people); setTotalCount(membersResult.totalCount);
      }
    } finally { setIsLoading(false); }
  }, [groupId, appUser, router]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkAttendance = async (event: GroupEvent) => {
    setMarkingEvent(event);
    setIsViewingAttendanceLoading(true);
    try {
        const attRef = collection(db, 'groups', groupId, 'events', event.id, 'attendance');
        const snap = await getDocs(attRef);
        const attendeeIds = new Set(snap.docs.map(d => d.id));
        const { people: allGroupMembers } = await getPeople(appUser!, { groupId, ignoreLimit: true });
        setAttendanceMembers(allGroupMembers.map(p => ({ ...p, isMarked: attendeeIds.has(p.id) })) as any);
    } finally { setIsViewingAttendanceLoading(false); }
  };

  const handleStartSession = async (eventName: string) => {
    if (!appUser || !group) return;
    const pIds = selectedIds.size > 0 ? Array.from(selectedIds) : group.peopleIds;
    const hId = await trackSessionStart({ name: eventName, peopleIds: pIds }, appUser);
    const pSession = { event: eventName, peopleIds: pIds, currentIndex: 0, assignedById: appUser.id, assignedByName: appUser.name, historyId: hId };
    await updateUser(appUser.id, { pausedCallingSession: pSession });
    setAppUser(prev => prev ? { ...prev, pausedCallingSession: pSession } : null);
    router.push('/session');
  };

  const handleRestorePerson = async (personId: string) => {
    if (!appUser) return;
    try {
        await restorePerson(personId, { id: appUser.id, name: appUser.name, role: appUser.role });
        toast({ title: "Contact Restored", description: "The contact is now back in their regular preaching stage." });
        fetchData();
    } catch (e) {
        toast({ variant: 'destructive', title: "Restore Failed" });
    }
  };

  if (isLoading && !group) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!group) return null;

  const isRestoreGroup = groupId === 'dynamic-recycle-bin' || groupId === 'dynamic-shifted-not-interested';

  return (
    <>
        <header className="sticky top-0 z-30 flex h-auto flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-4 py-4 sm:px-6">
            <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">Outreach Group</span>
                <h1 className="font-black text-xl sm:text-2xl md:text-3xl leading-none truncate text-foreground uppercase tracking-tighter">{group.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 px-4 font-bold border-border text-muted-foreground bg-muted/50 rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                
                {!group.isDynamic && (
                  <>
                    <Button size="sm" onClick={() => setIsAddMembersDialogOpen(true)} className="h-10 px-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold rounded-xl border-2"><Users className="h-4 w-4 mr-2" /> Members</Button>
                    <Button size="sm" onClick={() => setIsEventCreateOpen(true)} className="h-10 px-4 bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 font-black rounded-xl border-2"><CalendarDays className="h-4 w-4 mr-2" /> Create Milestone</Button>
                  </>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-10 px-4 font-bold border-border text-foreground bg-muted/50 rounded-xl"><Wrench className="h-4 w-4 mr-2" /> Tools</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground">
                        {!group.isDynamic && <DropdownMenuItem onSelect={() => setIsGroupEditDialogOpen(true)} className="font-bold"><Edit className="mr-2 h-4 w-4" /> Edit Group</DropdownMenuItem>}
                        <DropdownMenuItem onSelect={() => { setQrEvent(null); setIsQRDialogOpen(true); }} className="font-bold"><QrCode className="mr-2 h-4 w-4" /> Group QR</DropdownMenuItem>
                        {!group.isDynamic && (
                          <>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem className="text-destructive font-black" onSelect={() => deleteGroupSvc(group.id, appUser!).then(() => router.push('/groups'))}><Trash2 className="mr-2 h-4 w-4" /> Delete Group</DropdownMenuItem>
                          </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="members" className="w-full">
                <TabsList className="grid w-fit grid-cols-3 h-16 p-1 bg-card border-none rounded-3xl gap-1 mb-8">
                    <TabsTrigger value="members" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                        <Users className="h-4 w-4 mr-2" /> Members ({totalCount || members.length})
                    </TabsTrigger>
                    {!group.isDynamic && (
                      <TabsTrigger value="attendance" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                          <CalendarCheck className="h-4 w-4 mr-2" /> History
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="pulse" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                        <Zap className="h-4 w-4 mr-2" /> Report
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-6 space-y-6">
                    <PersonTable 
                        people={members} 
                        onEdit={p => { setEditingPerson(p); setIsPersonDialogOpen(true); }} 
                        onDelete={id => deletePerson(id, appUser!).then(() => fetchData())} 
                        onStartCall={p => { setSelectedIds(new Set([p.id])); setIsConfirmSessionDialogOpen(true); }} 
                        onRestore={isRestoreGroup ? handleRestorePerson : undefined}
                        selectedIds={selectedIds} 
                        setSelectedIds={setSelectedIds} 
                        isSelectionActive={selectedIds.size > 0} 
                        showEnablerColumn={true} 
                        navigationContext={{ groupId, scope: 'all' }} 
                        totalCount={totalCount} 
                        isLoading={false} 
                    />
                </TabsContent>

                {!group.isDynamic && (
                  <TabsContent value="attendance" className="mt-6 space-y-6">
                      <div className="bg-card/30 border border-border rounded-[2.5rem] overflow-hidden">
                          {events.length > 0 ? (
                              <Table><TableHeader><TableRow className="border-border"><TableHead className="text-muted-foreground">Name</TableHead><TableHead className="text-muted-foreground">Mark</TableHead><TableHead className="text-right text-muted-foreground">Action</TableHead></TableRow></TableHeader>
                              <TableBody>{events.map(event => (
                                  <TableRow key={event.id} className="border-border"><TableCell className="font-bold text-foreground uppercase">{event.name}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => handleMarkAttendance(event)}>Mark Present</Button></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await deleteDoc(doc(db, 'groups', groupId, 'events', event.id)); fetchData(); }} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
                              ))}</TableBody></Table>
                          ) : <div className="py-24 text-center text-muted-foreground opacity-30">No history logged yet.</div>}
                      </div>
                  </TabsContent>
                )}

                <TabsContent value="pulse" className="mt-6"><IntelligentReportView group={group} people={members} /></TabsContent>
            </Tabs>
        </main>

        <CreateUpdateGroupDialog isOpen={isGroupEditDialogOpen} setIsOpen={setIsGroupEditDialogOpen} group={group} onSave={(d) => updateGroupSvc(group.id, d, appUser!).then(() => fetchData())} />
        <AddMembersToGroupDialog isOpen={isAddMembersDialogOpen} setIsOpen={setIsAddMembersDialogOpen} groupId={groupId} groupName={group.name} existingMemberIds={group.peopleIds} onSuccess={() => fetchData()} />
        <CreateEventDialog isOpen={isEventCreateOpen} setIsOpen={setIsEventCreateOpen} onSave={async d => { await createGroupEvent(groupId, d); fetchData(); }} />
        <FreshLeadQRDialog isOpen={isQRDialogOpen} setIsOpen={setIsQRDialogOpen} groupId={groupId} eventId={qrEvent?.id} eventName={qrEvent?.name || group.name} />
        <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} totalCount={selectedIds.size || group.peopleIds.length} singlePersonName={selectedIds.size === 1 ? members.find(m => m.id === Array.from(selectedIds)[0])?.fullName : group.name} />
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={async (d) => { await updatePerson(editingPerson.id, d, appUser!); fetchData(); return {success:true}; }} person={editingPerson} allPeople={members} />}

        <Dialog open={!!markingEvent} onOpenChange={(o) => !o && setMarkingEvent(null)}>
            <DialogContent className="sm:max-w-2xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-card border-b border-border">
                    <DialogTitle className="text-foreground font-black uppercase tracking-tight">Manual Log: {markingEvent?.name}</DialogTitle>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search member..." className="pl-10 bg-muted border-border text-foreground rounded-xl h-11" value={attendanceSearchQuery} onChange={e => setAttendanceSearchQuery(e.target.value)} />
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-8 space-y-2">
                        {isViewingAttendanceLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : attendanceMembers.length > 0 ? (
                            attendanceMembers.filter(p => p.fullName.toLowerCase().includes(attendanceSearchQuery.toLowerCase())).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.fullName.charAt(0)}</AvatarFallback></Avatar>
                                        <div><p className="text-foreground font-bold text-sm">{p.fullName}</p><p className="text-muted-foreground text-[10px]">{p.phone}</p></div>
                                    </div>
                                    {(p as any).isMarked ? (
                                        <Badge className="bg-green-500/20 text-green-500 border-none">PRESENT</Badge>
                                    ) : (
                                        <Button size="sm" variant="outline" className="h-8 rounded-lg border-primary/20 text-primary font-bold hover:bg-primary hover:text-primary-foreground" onClick={async () => { await markAttendance(p.id, groupId, group!.name, markingEvent!.id, markingEvent!.name); handleMarkAttendance(markingEvent!); }}>MARK</Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-muted-foreground font-bold uppercase tracking-widest text-xs">No entries.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </>
  );
}
