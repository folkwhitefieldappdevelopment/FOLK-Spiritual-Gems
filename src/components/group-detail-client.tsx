
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
import { AppSidebar } from '@/components/app-sidebar';
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function GroupDetailClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { appUser } = useAuth();

  const [activeTab, setActiveTab] = React.useState('members');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  
  const [group, setGroup] = React.useState<Group | null>(null);
  const [allStaticGroups, setAllStaticGroups] = React.useState<Group[]>([]);
  const [members, setMembers] = React.useState<Person[]>([]);
  const [totalCount, setTotalCount] = React.useState<number | null>(0);
  const [lastDocId, setLastDocId] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  
  const [events, setEvents] = React.useState<GroupEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = React.useState(false);
  const [viewingEvent, setViewingAttendanceRecord] = React.useState<GroupEvent | null>(null);
  const [markingEvent, setMarkingEvent] = React.useState<GroupEvent | null>(null);
  const [attendanceMembers, setAttendanceMembers] = React.useState<Person[]>([]);
  const [isViewingAttendanceLoading, setIsViewingAttendanceLoading] = React.useState(false);

  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(null);
  const [eventAttendees, setEventAttendees] = React.useState<Record<string, Person[]>>({});
  const [isEventAttendeesLoading, setIsEventAttendeesLoading] = React.useState<Record<string, boolean>>({});

  const [activeEventFilter, setActiveEventFilter] = React.useState<GroupEvent | null>(null);

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = React.useState(false);
  const [searchFilters, setSearchFilters] = React.useState({
    name: '', phone: '', location: '', stayingWith: '', chantingRounds: '', enablerInTouchWith: '',
    callStatus: '', contactSources: [] as string[], eventName: '', callerName: '', callDateFrom: '', callDateTo: ''
  });

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

  const fetchEvents = React.useCallback(async () => {
    if (!groupId) return;
    setIsEventsLoading(true);
    try {
        const records = await getGroupEvents(groupId);
        setEvents(records);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error fetching events' });
    } finally {
        setIsEventsLoading(false);
    }
  }, [groupId, toast]);

  const fetchData = React.useCallback(async (lastId?: string, refresh = false) => {
    if (!groupId || !appUser) return;
    
    if (lastId) setIsLoadingMore(true);
    else {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setIsLoadingMembers(true);
    }

    try {
      const [g, sg, settingsResult, eventsData] = await Promise.all([
        getGroup(groupId, appUser),
        getStaticGroups(appUser),
        Promise.all([
            getEnablers(appUser, 'assignment'),
            getContactSources(appUser),
            getStayingWithOptions(appUser)
        ]),
        getGroupEvents(groupId)
      ]);
      
      if (!g) { router.push('/groups'); return; }
      
      setGroup(g);
      setAllStaticGroups(sg);
      setEnablerOptions(settingsResult[0]);
      setContactSourceOptions(settingsResult[1]);
      setStayingWithOptions(settingsResult[2]);
      setEvents(eventsData);

      let personIdsToFetch = g.peopleIds;
      if (activeEventFilter) {
          const attRef = collection(db, 'groups', groupId, 'events', activeEventFilter.id, 'attendance');
          const snap = await getDocs(attRef);
          personIdsToFetch = snap.docs.map(d => d.id);
      }

      if (personIdsToFetch.length > 0) {
        const membersResult = await getPeople(appUser, { 
            personIds: personIdsToFetch, 
            filters: searchFilters as any, 
            lastDocId: lastId 
        });
        const { people, lastDocId: nextId, totalCount: count } = membersResult;
        setMembers(prev => lastId ? [...prev, ...people] : people);
        setLastDocId(nextId);
        setHasMore(nextId !== null);
        setTotalCount(count);
      } else {
        setMembers([]);
        setLastDocId(null);
        setHasMore(false);
        setTotalCount(0);
      }
      
    } catch (e) {
      toast({ variant: 'destructive', title: "Sync failed" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMembers(false);
      setIsLoadingMore(false);
    }
  }, [appUser, groupId, router, toast, searchFilters, activeEventFilter]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleResetFilters = () => {
    setSearchFilters({
        name: '', phone: '', location: '', stayingWith: '', chantingRounds: '', enablerInTouchWith: '',
        callStatus: '', contactSources: [], eventName: '', callerName: '', callDateFrom: '', callDateTo: ''
    });
  };

  const toggleEventAccordion = async (event: GroupEvent) => {
      if (expandedEventId === event.id) {
          setExpandedEventId(null);
          return;
      }
      
      setExpandedEventId(event.id);
      
      if (!eventAttendees[event.id]) {
          setIsEventAttendeesLoading(prev => ({ ...prev, [event.id]: true }));
          try {
              const attRef = collection(db, 'groups', groupId, 'events', event.id, 'attendance');
              const snap = await getDocs(attRef);
              const attendeeIds = snap.docs.map(d => d.id);
              
              if (attendeeIds.length > 0) {
                  const { people } = await getPeople(appUser!, { personIds: attendeeIds, ignoreLimit: true });
                  setEventAttendees(prev => ({ ...prev, [event.id]: people }));
              } else {
                  setEventAttendees(prev => ({ ...prev, [event.id]: [] }));
              }
          } catch (e) {
              toast({ variant: 'destructive', title: 'Error loading attendees' });
          } finally {
              setIsEventAttendeesLoading(prev => ({ ...prev, [event.id]: false }));
          }
      }
  };

  const handleManualMark = async (personId: string, event: GroupEvent) => {
      try {
          const result = await markAttendance(personId, groupId, group!.name, event.id, event.name);
          if (result.success) {
              toast({ title: 'Milestone Logged', description: `Attendance marked for ${event.name}.` });
              if (expandedEventId === event.id) {
                  const attRef = collection(db, 'groups', groupId, 'events', event.id, 'attendance');
                  const snap = await getDocs(attRef);
                  const attendeeIds = snap.docs.map(d => d.id);
                  if (attendeeIds.length > 0) {
                      const { people } = await getPeople(appUser!, { personIds: attendeeIds, ignoreLimit: true });
                      setEventAttendees(prev => ({ ...prev, [event.id]: people }));
                  }
              }
              fetchData(undefined, true);
              fetchEvents();
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.message });
          }
      } catch (e) {
          toast({ variant: 'destructive', title: 'Marking Failed' });
      }
  };

  const handleMarkAttendance = async (event: GroupEvent) => {
    setMarkingEvent(event);
    setIsViewingAttendanceLoading(true);
    try {
        const attRef = collection(db, 'groups', groupId, 'events', event.id, 'attendance');
        const snap = await getDocs(attRef);
        const attendeeIds = new Set(snap.docs.map(d => d.id));
        const { people: allGroupMembers } = await getPeople(appUser!, { groupId, ignoreLimit: true });
        setAttendanceMembers(allGroupMembers.map(p => ({
            ...p,
            isMarked: attendeeIds.has(p.id)
        })) as any);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error loading members' });
    } finally {
        setIsViewingAttendanceLoading(false);
    }
  };

  const handleStartSession = async (eventName: string) => {
    if (!appUser || !group) return;
    let peopleIdsForSession: string[] = [];
    let assignedById = group.createdBy || appUser.id;
    let assignedByName = group.createdByName || appUser.name;
    if (selectedIds.size > 0) {
      peopleIdsForSession = Array.from(selectedIds);
    } else {
      const { people: allMembers } = await getPeople(appUser, { groupId: group.id, ignoreLimit: true });
      peopleIdsForSession = allMembers.map(p => p.id);
      if (group.assignedBy) {
          assignedById = group.assignedBy;
          assignedByName = group.assignedByName || 'Assignor';
      }
    }
    if (peopleIdsForSession.length === 0) {
        toast({ variant: 'destructive', title: "No contacts to call." });
        return;
    }
    try {
        const { people: sessionPeople } = await getPeople(appUser, { personIds: peopleIdsForSession, ignoreLimit: true });
        const coEnablerIds = [...new Set(sessionPeople.map(p => p.coEnablerId).filter((id): id is string => !!id && id !== appUser.id))];
        const historyId = await trackSessionStart({ name: eventName, peopleIds: peopleIdsForSession, assignedById, assignedByName, coEnablerIds }, appUser);
        const pausedSession = { event: eventName, peopleIds: peopleIdsForSession, currentIndex: 0, assignedById, assignedByName, historyId, coEnablerIds };
        await updateUser(appUser.id, { pausedCallingSession: pausedSession });
        setAppUser(prev => prev ? { ...prev, pausedCallingSession: pausedSession } : null);
        router.push('/session');
    } catch (e) {
        toast({ variant: 'destructive', title: "Session Error" });
    }
  };

  const handleCreateEvent = async (data: any) => {
    if (!groupId) return;
    try {
        await createGroupEvent(groupId, data);
        toast({ title: 'Milestone Initialized' });
        fetchEvents();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Creation Failed' });
    }
  };

  const filteredMarkingMembers = React.useMemo(() => {
    if (!attendanceSearchQuery) return attendanceMembers;
    const lower = attendanceSearchQuery.toLowerCase();
    return attendanceMembers.filter(p => p.fullName.toLowerCase().includes(lower) || p.phone.includes(attendanceSearchQuery));
  }, [attendanceMembers, attendanceSearchQuery]);

  const handleBulkDelete = async () => {
    if (!appUser || selectedIds.size === 0) return;
    await deletePeople(Array.from(selectedIds), appUser);
    toast({ title: 'Contacts Deleted' });
    setSelectedIds(new Set());
    fetchData(undefined, true);
  };

  const handleBulkAddToGroup = async (targetGroupId: string) => {
    if (!appUser || selectedIds.size === 0) return;
    await addPeopleToGroup(targetGroupId, Array.from(selectedIds), appUser);
    toast({ title: 'Added to Group' });
    setSelectedIds(new Set());
  };

  if (isLoading && !group) return <div className="flex h-screen items-center justify-center bg-[#11121d]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!group) return null;

  const isSelectionActive = selectedIds.size > 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#11121d]">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <header className="sticky top-0 z-30 flex h-auto flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 bg-[#11121d]/95 backdrop-blur px-4 py-4 sm:px-6">
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Outreach Group</span>
                    <h1 className="font-black text-xl sm:text-2xl md:text-3xl leading-none truncate text-white uppercase tracking-tighter">{group.name}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.back()} className="h-10 px-4 font-bold border-white/10 text-slate-400 bg-white/5 hover:bg-white/10 rounded-xl">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button size="sm" onClick={() => setIsAddMembersDialogOpen(true)} className="h-10 px-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold rounded-xl border-2">
                        <Users className="h-4 w-4 mr-2" /> Members
                    </Button>
                    <Button size="sm" onClick={() => setIsEventCreateOpen(true)} className="h-10 px-4 bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/20 hover:bg-[#FF9800]/20 font-black rounded-xl border-2">
                        <CalendarDays className="h-4 w-4 mr-2" /> Create Milestone
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 px-4 font-bold border-white/10 text-white bg-white/5 rounded-xl">
                                <Wrench className="h-4 w-4 mr-2" /> Tools
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#1e1e2e] border-white/5 text-white">
                            <DropdownMenuItem onSelect={() => setIsGroupEditDialogOpen(true)} className="font-bold"><Edit className="mr-2 h-4 w-4" /> Edit Group</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setQrEvent(null); setIsQRDialogOpen(true); }} className="font-bold"><QrCode className="mr-2 h-4 w-4" /> Group QR</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportContactsToExcel(members, group.name, allStaticGroups)} className="font-bold"><Download className="mr-2 h-4 w-4" /> Export Excel</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem className="text-red-500 font-black" onSelect={() => deleteGroupSvc(group.id, appUser!).then(() => router.push('/groups'))}><Trash2 className="mr-2 h-4 w-4" /> Delete Group</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="members" className="w-full">
                    <TabsList className="grid w-fit grid-cols-3 h-16 p-1 bg-[#1b1d32] border-none rounded-3xl gap-1 mb-8">
                        <TabsTrigger value="members" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8] data-[state=active]:text-white data-[state=inactive]:text-slate-500" onClick={() => setActiveEventFilter(null)}>
                            <Users className="h-4 w-4 mr-2" /> Members ({totalCount || members.length})
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8] data-[state=active]:text-white data-[state=inactive]:text-slate-500" onClick={() => { setActiveEventFilter(null); fetchEvents(); }}>
                            <CalendarCheck className="h-4 w-4 mr-2" /> Event History
                        </TabsTrigger>
                        <TabsTrigger value="pulse" className="px-8 py-3 font-black uppercase tracking-widest text-[11px] rounded-2xl data-[state=active]:bg-[#929DD8] data-[state=active]:text-white data-[state=inactive]:text-slate-500" onClick={() => setActiveEventFilter(null)}>
                            <Zap className="h-4 w-4 mr-2" /> Pulse Report
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="members" className="mt-6 space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <Input 
                                        placeholder="Quick search by name or phone..." 
                                        className="h-14 pl-12 rounded-2xl bg-[#1b1d32] border-none text-white font-bold shadow-2xl focus-visible:ring-primary" 
                                        value={searchFilters.name || searchFilters.phone} 
                                        onChange={(e) => { 
                                            const val = e.target.value; 
                                            const isNum = /^[0-9]+$/.test(val); 
                                            setSearchFilters(p => ({...p, name: isNum ? '' : val, phone: isNum ? val : ''})); 
                                        }} 
                                    />
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)} 
                                    className={cn("h-14 px-8 w-full md:w-auto rounded-2xl border-white/5 bg-[#1b1d32] text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px]", isAdvancedSearchOpen && "bg-primary text-white border-primary")}
                                >
                                    <SlidersHorizontal className="h-4 w-4 mr-3" />
                                    {isAdvancedSearchOpen ? 'Hide Options' : 'Filters'}
                                </Button>
                            </div>

                            {isSelectionActive && (
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-[#929DD8] rounded-2xl sticky top-20 z-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-3 px-4">
                                        <div className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black text-white shadow-inner uppercase tracking-wider">
                                            {selectedIds.size} selected
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 ml-auto pr-2">
                                        <Button variant="ghost" size="sm" onClick={() => setIsConfirmSessionDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 rounded-xl">
                                            <PhoneCall className="mr-2 h-4 w-4" /> Start Session
                                        </Button>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 rounded-xl">
                                                    Group
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-[#1e1e2e] border-white/10 text-white p-2 rounded-2xl shadow-2xl border-none">
                                                <DropdownMenuItem onSelect={() => setIsGroupEditDialogOpen(true)} className="font-black text-xs uppercase tracking-tight py-3 px-4 focus:bg-white/10 rounded-xl cursor-pointer">
                                                    <PlusCircle className="mr-3 h-5 w-5" /> Create New Group
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-white/5 my-2" />
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-4 py-2">Add Selected To</DropdownMenuLabel>
                                                <ScrollArea className="max-h-60">
                                                    {allStaticGroups.filter(g => !g.isDynamic).map(g => (
                                                        <DropdownMenuItem key={g.id} onSelect={() => handleBulkAddToGroup(g.id)} className="font-bold text-xs py-3 px-4 focus:bg-white/10 rounded-xl cursor-pointer">
                                                            {g.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </ScrollArea>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button variant="ghost" size="sm" onClick={() => setIsAssignEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 rounded-xl">
                                            Enabler
                                        </Button>

                                        <Button variant="ghost" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 rounded-xl">
                                            Co-Enabler
                                        </Button>

                                        <Button variant="ghost" size="sm" onClick={() => setIsUpdateSourceDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 rounded-xl">
                                            Source
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-10 w-10 font-bold shadow-xl bg-red-600 hover:bg-red-700 rounded-xl shrink-0">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-[#1e1e2e] border-none text-white rounded-[2rem]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-black uppercase tracking-tight">Bulk Delete Contacts</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-400 font-bold">
                                                        Are you sure you want to delete {selectedIds.size} selected contacts? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-white/5 border-white/10 text-white rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 rounded-xl font-black uppercase tracking-widest">Delete All</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10">
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Collapsible open={isAdvancedSearchOpen}>
                            <CollapsibleContent>
                                <div className="bg-[#1b1d32] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="p-8 space-y-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">LOCATION</Label>
                                                <Input placeholder="Search area..." value={searchFilters.location} onChange={e => setSearchFilters(p => ({...p, location: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2"><UserCheck className="h-3 w-3" /> PRIMARY ENABLER</Label>
                                                <Select value={searchFilters.enablerInTouchWith} onValueChange={v => setSearchFilters(p => ({...p, enablerInTouchWith: v}))}>
                                                    <SelectTrigger className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4"><SelectValue placeholder="Select coordinator..." /></SelectTrigger>
                                                    <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                                                        {enablerOptions.map(o => <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2"><Tag className="h-3 w-3" /> CONTACT SOURCE</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 justify-between">
                                                            <span className="truncate">{searchFilters.contactSources.length > 0 ? `${searchFilters.contactSources.length} selected` : 'Choose sources...'}</span>
                                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="bg-[#1e1e2e] border-white/5 text-white p-2 w-[240px]">
                                                        <ScrollArea className="h-[200px]">
                                                            <div className="space-y-1">
                                                                {contactSourceOptions.map(o => (
                                                                    <div key={o} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => { 
                                                                        const next = searchFilters.contactSources.includes(o) ? searchFilters.contactSources.filter(s => s !== o) : [...searchFilters.contactSources, o]; 
                                                                        setSearchFilters(p => ({...p, contactSources: next})); 
                                                                    }}>
                                                                        <Checkbox checked={searchFilters.contactSources.includes(o)} onCheckedChange={() => {}} />
                                                                        <span className="text-sm font-bold">{o}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                        <div className="flex justify-end items-center gap-4 pt-6 border-t border-white/5">
                                            <Button variant="ghost" onClick={handleResetFilters} className="font-black text-slate-500 uppercase text-[10px] tracking-widest hover:bg-white/5 px-8 h-12 rounded-xl">Reset Defaults</Button>
                                            <Button onClick={() => { fetchData(); }} className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-12 h-14 rounded-2xl shadow-xl shadow-primary/20">Apply Filters</Button>
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {activeEventFilter && (
                            <div className="flex items-center gap-3 p-4 bg-primary/10 border-2 border-primary/20 rounded-[1.5rem] animate-in fade-in slide-in-from-top-4">
                                <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20"><FolderOpen className="h-5 w-5 text-white" /></div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-sm text-primary uppercase tracking-tight truncate">Milestone Folder: {activeEventFilter.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(activeEventFilter.date), 'PPPP')}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setActiveEventFilter(null)} className="h-9 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5 mr-2" /> Show Full List</Button>
                            </div>
                        )}
                        <PersonTable people={members} onEdit={p => { setEditingPerson(p); setIsPersonDialogOpen(true); }} onDelete={id => deletePerson(id, appUser!).then(() => fetchData(undefined, true))} onStartCall={p => { setSelectedIds(new Set([p.id])); setIsConfirmSessionDialogOpen(true); }} selectedIds={selectedIds} setSelectedIds={setSelectedIds} isSelectionActive={selectedIds.size > 0} showEnablerColumn={true} navigationContext={{ groupId, scope: 'all' }} totalCount={totalCount} isLoading={isLoadingMembers} />
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-6 space-y-6">
                        <div className="bg-[#1b1d32]/30 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            {isEventsLoading ? (
                                <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                            ) : events.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-black/20">
                                        <TableRow className="hover:bg-transparent border-b border-white/5 h-20">
                                            <TableHead className="w-12 px-6"></TableHead>
                                            <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500">Milestone Name</TableHead>
                                            <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 text-center">Mark Attendance</TableHead>
                                            <TableHead className="font-black text-[11px] uppercase tracking-widest text-slate-500 text-center">Unified QR</TableHead>
                                            <TableHead className="text-right pr-10 font-black text-[11px] uppercase tracking-widest text-slate-500"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {events.map(event => (
                                            <React.Fragment key={event.id}>
                                                <TableRow className="border-b border-white/5 h-20 group hover:bg-white/[0.02]">
                                                    <TableCell className="px-6">
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white" onClick={() => toggleEventAccordion(event)}>
                                                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expandedEventId === event.id && "rotate-180")} />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-white uppercase truncate tracking-tight">{event.name}</span>
                                                                <Badge variant="outline" className="h-5 px-2 bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase">{event.attendeeCount || 0} PRESENT</Badge>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(event.date), 'PPPP')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button size="sm" variant="outline" className="h-10 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/10" onClick={() => handleMarkAttendance(event)}>
                                                            <UserPlus className="h-4 w-4 mr-2" /> Mark Now
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl border-[#FF9800]/20 bg-[#FF9800]/5 text-[#FF9800] hover:bg-[#FF9800]/10" onClick={() => { setQrEvent({ id: event.id, name: event.name }); setIsQRDialogOpen(true); }}>
                                                            <QrCode className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-10">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-white"><Maximize2 className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-[#1e1e2e] border-white/10 text-white rounded-2xl p-2 shadow-2xl">
                                                                <DropdownMenuItem onSelect={() => setActiveEventFilter(event)} className="font-bold rounded-xl cursor-pointer"><FolderOpen className="mr-2 h-4 w-4" /> Filter Group List</DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-white/5" />
                                                                <DropdownMenuItem className="text-red-500 font-bold rounded-xl cursor-pointer" onSelect={async () => { await deleteDoc(doc(db, 'groups', groupId, 'events', event.id)); fetchEvents(); }}><Trash2 className="mr-2 h-4 w-4" /> Delete Log</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedEventId === event.id && (
                                                    <TableRow className="bg-black/20 hover:bg-black/20 border-b border-white/5">
                                                        <TableCell colSpan={5} className="p-0">
                                                            <div className="p-8 sm:p-12 animate-in slide-in-from-top-2 duration-300">
                                                                <div className="flex items-center justify-between mb-8">
                                                                    <div className="space-y-1">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Participants List</h4>
                                                                        <p className="text-[10px] font-bold text-slate-500">{eventAttendees[event.id]?.length || 0} Souls marked present</p>
                                                                    </div>
                                                                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-slate-600 hover:text-white" onClick={() => toggleEventAccordion(event)}>
                                                                        <X className="h-3.5 w-3.5 mr-1.5" /> Hide
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {isEventAttendeesLoading[event.id] ? (
                                                                        [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)
                                                                    ) : eventAttendees[event.id]?.length > 0 ? (
                                                                        eventAttendees[event.id].map(p => (
                                                                            <div key={p.id} className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                                                                                <div className="flex items-center gap-4 min-w-0">
                                                                                    <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                                                                                        <AvatarImage src={p.photoUrl} className="object-cover" />
                                                                                        <AvatarFallback className="bg-slate-800 text-white font-black">{p.fullName[0]}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-sm font-black text-white uppercase truncate tracking-tight">{p.fullName}</p>
                                                                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{p.phone}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500/30 hover:text-red-500 hover:bg-red-500/10 shrink-0" onClick={() => removeAttendance(p.id, groupId, event.id).then(() => { delete eventAttendees[event.id]; toggleEventAccordion(event); toggleEventAccordion(event); })}>
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="col-span-full py-16 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
                                                                            <Users className="h-10 w-10 mx-auto mb-3" />
                                                                            <p className="text-[10px] font-black uppercase tracking-widest">No attendees found in this record</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="col-span-full py-24 text-center">
                                    <CalendarCheck className="h-16 w-16 mx-auto mb-6 text-slate-500 opacity-20" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Empty History</h3>
                                    <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">Create a milestone to log attendance records.</p>
                                    <Button onClick={() => setIsEventCreateOpen(true)} className="mt-8 bg-primary text-white font-black rounded-xl h-12 px-8 shadow-xl shadow-primary/20 uppercase tracking-widest text-[10px]">Initialize First Milestone</Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="pulse" className="mt-6">
                        <IntelligentReportView group={group} people={members} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>

        <CreateUpdateGroupDialog isOpen={isGroupEditDialogOpen} setIsOpen={setIsGroupEditDialogOpen} group={group} onSave={(d) => updateGroupSvc(group.id, d, appUser!).then(() => fetchData(undefined, true))} />
        <AddMembersToGroupDialog isOpen={isAddMembersDialogOpen} setIsOpen={setIsAddMembersDialogOpen} groupId={groupId} groupName={group.name} existingMemberIds={group.peopleIds} onSuccess={() => fetchData(undefined, true)} />
        <CreateEventDialog isOpen={isEventCreateOpen} setIsOpen={setIsEventCreateOpen} onSave={handleCreateEvent} />
        <FreshLeadQRDialog isOpen={isQRDialogOpen} setIsOpen={setIsQRDialogOpen} groupId={groupId} eventId={qrEvent?.id} eventName={qrEvent?.name || group.name} />
        <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} totalCount={selectedIds.size || group.peopleIds.length} pausedSession={appUser?.pausedCallingSession} onResumeSession={() => router.push('/session')} />
        <AssignEnablerDialog isOpen={isAssignEnablerDialogOpen} setIsOpen={setIsAssignEnablerDialogOpen} onSave={async (u) => { await assignEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={async (u) => { await assignCoEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} selectedPersonIds={Array.from(selectedIds)} />
        <UpdateContactSourceDialog isOpen={isUpdateSourceDialogOpen} setIsOpen={setIsUpdateSourceDialogOpen} onSave={async (s) => { await updatePeopleContactSource(Array.from(selectedIds), s, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        <ContactGalleryDialog isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} people={members} />
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={async (d) => { const r = await updatePerson(editingPerson.id, d, appUser!); fetchData(undefined, true); return r; }} person={editingPerson} allPeople={members} />}

        <Dialog open={!!viewingEvent} onOpenChange={(o) => !o && setViewingAttendanceRecord(null)}>
            <DialogContent className="sm:max-w-2xl bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-[#1b1d32] border-b border-white/5">
                    <DialogTitle className="text-white font-black uppercase tracking-tight">{viewingEvent?.name} Attendees</DialogTitle>
                    <div className="flex items-center justify-between mt-2"><span className="text-slate-500 font-bold text-xs">{attendanceMembers.length} check-ins recorded.</span></div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-8 space-y-4">
                        {isViewingAttendanceLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : attendanceMembers.length > 0 ? (
                            attendanceMembers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-primary/20"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.fullName[0]}</AvatarFallback></Avatar>
                                        <div><p className="text-white font-black text-sm">{p.fullName}</p><p className="text-slate-500 text-[10px] font-bold">{p.phone}</p></div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => removeAttendance(p.id, groupId, viewingEvent!.id).then(() => handleViewEventAttendance(viewingEvent!))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-xs">No attendees found.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        <Dialog open={!!markingEvent} onOpenChange={(o) => !o && setMarkingEvent(null)}>
            <DialogContent className="sm:max-w-2xl bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-[#1b1d32] border-b border-white/5">
                    <DialogTitle className="text-white font-black uppercase tracking-tight">Manual Log: {markingEvent?.name}</DialogTitle>
                    <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input placeholder="Search member name..." className="pl-10 bg-[#161623] border-white/5 text-white rounded-xl h-11" value={attendanceSearchQuery} onChange={e => setAttendanceSearchQuery(e.target.value)} /></div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-8 space-y-2">
                        {isViewingAttendanceLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : filteredMarkingMembers.length > 0 ? (
                            filteredMarkingMembers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.fullName[0]}</AvatarFallback></Avatar>
                                        <div><p className="text-white font-bold text-sm">{p.fullName}</p><p className="text-slate-500 text-[10px]">{p.phone}</p></div>
                                    </div>
                                    {(p as any).isMarked ? (
                                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">PRESENT</Badge>
                                    ) : (
                                        <Button size="sm" variant="outline" className="h-8 rounded-lg border-primary/20 text-primary font-bold hover:bg-primary hover:text-white" onClick={() => handleManualMark(p.id, markingEvent!)}>MARK PRESENT</Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-xs">Matching members not found.</p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}
