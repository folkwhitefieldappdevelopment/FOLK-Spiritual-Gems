'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Users,
  PlusCircle,
  RefreshCw,
  Tag,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Wrench,
  QrCode,
  Download,
  CalendarCheck,
  Maximize2,
  BadgeCheck,
  UserPlus,
  Edit,
  RotateCcw,
  CalendarDays,
  FolderOpen,
  Calendar,
  Disc,
  Search,
  Zap,
  History,
  User,
  X,
  PhoneCall
} from 'lucide-react';
import type { Person, Group, AppUser, GroupEvent } from '@/lib/types';
import { useAppToast } from '@/contexts/toast-context';
import { getGroup, getStaticGroups, addPeopleToGroup, deleteGroup as deleteGroupSvc, updateGroup as updateGroupSvc } from '@/services/groups-service';
import { 
  getPeople, 
  updatePerson, 
  deletePerson, 
  deletePeople,
  assignEnablerToPeople,
  assignCoEnablerToPeople,
  updatePeopleContactSource
} from '@/services/people-service';
import { getEnablers, getContactSources, getStayingWithOptions, type EnablerOption } from '@/services/settings-service';
import { getGroupEvents, createGroupEvent, markAttendance, removeAttendance } from '@/services/attendance-service';
import { useAuth } from '@/contexts/auth-context';
import { updateUser } from '@/services/user-service';
import { trackSessionStart } from '@/services/session-history-service';
import { Button } from '@/components/ui/button';
import { PersonTable } from '@/components/person-table';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { AssignEnablerDialog } from '@/components/assign-enabler-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { UpdateContactSourceDialog } from '@/components/update-contact-source-dialog';
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
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { exportContactsToExcel } from '@/services/import-export-service';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function GroupDetailClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { appUser } = useAuth();

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
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [qrEvent, setQrEvent] = React.useState<{ id: string, name: string } | null>(null);
  const [isAssignEnablerDialogOpen, setIsAssignEnablerDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isUpdateSourceDialogOpen, setIsUpdateSourceDialogOpen] = React.useState(false);
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = React.useState('');

  const fetchData = React.useCallback(async () => {
    if (!groupId || !appUser) return;
    setIsLoading(true);
    try {
      const [g, enablers, sources, stayings, eventsData] = await Promise.all([
        getGroup(groupId, appUser), getEnablers(appUser, 'assignment'), getContactSources(appUser), getStayingWithOptions(appUser), getGroupEvents(groupId)
      ]);
      if (!g) { router.push('/groups'); return; }
      setGroup(g);
      setEnablerOptions(enablers);
      setContactSourceOptions(sources);
      setStayingWithOptions(stayings);
      setEvents(eventsData);
      const membersResult = await getPeople(appUser, { personIds: g.peopleIds, ignoreLimit: true });
      setMembers(membersResult.people);
      setTotalCount(membersResult.totalCount);
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

  if (isLoading && !group) return <div className="flex h-screen items-center justify-center bg-[#11121d]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!group) return null;

  return (
    <>
        <header className="sticky top-0 z-30 flex h-auto flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 bg-[#11121d]/95 backdrop-blur px-4 py-4 sm:px-6">
            <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Outreach Group</span>
                <h1 className="font-black text-xl sm:text-2xl md:text-3xl leading-none truncate text-white uppercase tracking-tighter">{group.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 px-4 font-bold border-white/10 text-slate-400 bg-white/5 rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <Button size="sm" onClick={() => setIsAddMembersDialogOpen(true)} className="h-10 px-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold rounded-xl border-2"><Users className="h-4 w-4 mr-2" /> Members</Button>
                <Button size="sm" onClick={() => setIsEventCreateOpen(true)} className="h-10 px-4 bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/20 font-black rounded-xl border-2"><CalendarDays className="h-4 w-4 mr-2" /> Create Milestone</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-10 px-4 font-bold border-white/10 text-white bg-white/5 rounded-xl"><Wrench className="h-4 w-4 mr-2" /> Tools</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#1e1e2e] border-white/5 text-white">
                        <DropdownMenuItem onSelect={() => setIsGroupEditDialogOpen(true)} className="font-bold"><Edit className="mr-2 h-4 w-4" /> Edit Group</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setQrEvent(null); setIsQRDialogOpen(true); }} className="font-bold"><QrCode className="mr-2 h-4 w-4" /> Group QR</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 font-black" onSelect={() => deleteGroupSvc(group.id, appUser!).then(() => router.push('/groups'))}><Trash2 className="mr-2 h-4 w-4" /> Delete Group</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="members" className="w-full">
                <TabsList className="grid w-fit grid-cols-3 h-16 p-1 bg-[#1b1d32] border-none rounded-3xl gap-1 mb-8">
                    <TabsTrigger value="members" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8]">Members ({totalCount || members.length})</TabsTrigger>
                    <TabsTrigger value="attendance" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8]">History</TabsTrigger>
                    <TabsTrigger value="pulse" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8]">Report</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-6 space-y-6">
                    <PersonTable people={members} onEdit={p => { setEditingPerson(p); setIsPersonDialogOpen(true); }} onDelete={id => deletePerson(id, appUser!).then(() => fetchData())} onStartCall={p => { setSelectedIds(new Set([p.id])); setIsConfirmSessionDialogOpen(true); }} selectedIds={selectedIds} setSelectedIds={setSelectedIds} isSelectionActive={selectedIds.size > 0} showEnablerColumn={true} navigationContext={{ groupId, scope: 'all' }} totalCount={totalCount} isLoading={false} />
                </TabsContent>

                <TabsContent value="attendance" className="mt-6 space-y-6">
                    <div className="bg-[#1b1d32]/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
                        {events.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Mark</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>{events.map(event => (
                                <TableRow key={event.id}><TableCell className="font-bold text-white uppercase">{event.name}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => handleMarkAttendance(event)}>Mark Present</Button></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await deleteDoc(doc(db, 'groups', groupId, 'events', event.id)); fetchData(); }}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
                            ))}</TableBody></Table>
                        ) : <div className="py-24 text-center opacity-30">No history logged yet.</div>}
                    </div>
                </TabsContent>

                <TabsContent value="pulse" className="mt-6"><IntelligentReportView group={group} people={members} /></TabsContent>
            </Tabs>
        </main>

        <CreateUpdateGroupDialog isOpen={isGroupEditDialogOpen} setIsOpen={setIsGroupEditDialogOpen} group={group} onSave={(d) => updateGroupSvc(group.id, d, appUser!).then(() => fetchData())} />
        <AddMembersToGroupDialog isOpen={isAddMembersDialogOpen} setIsOpen={setIsAddMembersDialogOpen} groupId={groupId} groupName={group.name} existingMemberIds={group.peopleIds} onSuccess={() => fetchData()} />
        <CreateEventDialog isOpen={isEventCreateOpen} setIsOpen={setIsEventCreateOpen} onSave={handleCreateEvent} />
        <FreshLeadQRDialog isOpen={isQRDialogOpen} setIsOpen={setIsQRDialogOpen} groupId={groupId} eventId={qrEvent?.id} eventName={qrEvent?.name || group.name} />
        <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} totalCount={selectedIds.size || group.peopleIds.length} singlePersonName={selectedIds.size === 1 ? members.find(m => m.id === Array.from(selectedIds)[0])?.fullName : group.name} />
        <ContactGalleryDialog isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} people={members} />
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={async (d) => { await updatePerson(editingPerson.id, d, appUser!); fetchData(); return {success:true}; }} person={editingPerson} allPeople={members} />}
    </>
  );
}
