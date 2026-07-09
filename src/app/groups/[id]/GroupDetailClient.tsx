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
  User
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
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
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

  const [activeEventFilter, setActiveEventFilter] = React.useState<GroupEvent | null>(null);

  // Advanced Search Dashboard is CLOSED by default
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

  const handleViewEventAttendance = async (event: GroupEvent) => {
    setViewingAttendanceRecord(event);
    setIsViewingAttendanceLoading(true);
    try {
        const attRef = collection(db, 'groups', groupId, 'events', event.id, 'attendance');
        const snap = await getDocs(attRef);
        const attendeeIds = snap.docs.map(d => d.id);
        
        if (attendeeIds.length > 0) {
            const { people } = await getPeople(appUser!, { personIds: attendeeIds, ignoreLimit: true });
            setAttendanceMembers(people);
        } else {
            setAttendanceMembers([]);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error loading attendees' });
    } finally {
        setIsViewingAttendanceLoading(false);
    }
  };

  const handleManualMark = async (personId: string, event: GroupEvent) => {
      try {
          const result = await markAttendance(personId, groupId, group!.name, event.id, event.name);
          if (result.success) {
              toast({ title: 'Milestone Logged', description: `Attendance marked for ${event.name}.` });
              if (viewingEvent?.id === event.id) handleViewEventAttendance(event);
              if (markingEvent?.id === event.id) handleMarkAttendance(event);
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

  if (isLoading && !group) return <div className="flex h-screen items-center justify-center bg-[#11121d]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!group) return null;

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
                        {/* Advanced Search Bar Restored & Updated for Group context */}
                        <div className="bg-[#1b1d32] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-[#1b1d32] p-6 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-[0.2em] text-[#FF9800]">ADVANCED CONTACT SEARCH</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)} className="text-slate-500">
                                    <ChevronDown className={cn("h-5 w-5 transition-transform", isAdvancedSearchOpen && "rotate-180")} />
                                </Button>
                            </div>
                            <Collapsible open={isAdvancedSearchOpen}>
                                <CollapsibleContent>
                                    <div className="p-8 space-y-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NAME</Label>
                                                <Input placeholder="Search member name..." value={searchFilters.name} onChange={e => setSearchFilters(p => ({...p, name: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">PHONE</Label>
                                                <Input placeholder="10-digit number..." value={searchFilters.phone} onChange={e => setSearchFilters(p => ({...p, phone: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">LOCATION</Label>
                                                <Input placeholder="Search location..." value={searchFilters.location} onChange={e => setSearchFilters(p => ({...p, location: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2"><History className="h-3 w-3" /> EVENT NAME (HISTORY)</Label>
                                                <Input placeholder="e.g. Sunday Feast..." value={searchFilters.eventName} onChange={e => setSearchFilters(p => ({...p, eventName: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2"><User className="h-3 w-3" /> CALLER NAME (HISTORY)</Label>
                                                <Input placeholder="Who logged the call?..." value={searchFilters.callerName} onChange={e => setSearchFilters(p => ({...p, callerName: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 focus-visible:ring-primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2"><Calendar className="h-3 w-3" /> CALL DATE FROM</Label>
                                                <Input type="date" value={searchFilters.callDateFrom} onChange={e => setSearchFilters(p => ({...p, callDateFrom: e.target.value}))} className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4 [color-scheme:dark]" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">STAYING WITH</Label>
                                                <Select value={searchFilters.stayingWith} onValueChange={v => setSearchFilters(p => ({...p, stayingWith: v}))}>
                                                    <SelectTrigger className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4"><SelectValue placeholder="Staying with..." /></SelectTrigger>
                                                    <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                                                        {stayingWithOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">CHANTING ROUNDS</Label>
                                                <Select value={searchFilters.chantingRounds} onValueChange={v => setSearchFilters(p => ({...p, chantingRounds: v}))}>
                                                    <SelectTrigger className="h-12 bg-[#161623] border-none rounded-xl text-white font-bold px-4"><SelectValue placeholder="Chanting rounds..." /></SelectTrigger>
                                                    <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                                                        {Array.from({length: 17}, (_, i) => i.toString()).map(r => <SelectItem key={r} value={r} className="font-bold">{r} Rounds</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end items-center gap-4 pt-6 border-t border-white/5">
                                            <Button variant="ghost" onClick={handleResetFilters} className="font-black text-slate-500 uppercase text-[10px] tracking-widest hover:bg-white/5 px-8 h-12 rounded-xl">Reset Defaults</Button>
                                            <Button onClick={() => { fetchData(); }} className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-12 h-14 rounded-2xl shadow-xl shadow-primary/20">Apply Smart Filters</Button>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

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
                        <PersonTable 
                          people={members} 
                          onEdit={p => { setEditingPerson(p); setIsPersonDialogOpen(true); }} 
                          onDelete={id => deletePerson(id, appUser!).then(() => fetchData(undefined, true))} 
                          onStartCall={p => { setSelectedIds(new Set([p.id])); setIsConfirmSessionDialogOpen(true); }} 
                          selectedIds={selectedIds} 
                          setSelectedIds={setSelectedIds} 
                          isSelectionActive={selectedIds.size > 0} 
                          showEnablerColumn={true} 
                          navigationContext={{ groupId, scope: 'all' }} 
                          totalCount={totalCount} 
                          isLoading={isLoadingMembers} 
                        />
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8 max-w-5xl">
                            {isEventsLoading ? (
                                [...Array(2)].map((_, i) => <div key={i} className="h-64 bg-[#1e1e2e] animate-pulse rounded-[2.5rem]" />)
                            ) : events.length > 0 ? (
                                events.map(event => (
                                    <Card key={event.id} className="bg-[#1e1e2e] border-none rounded-[2.5rem] overflow-hidden group/event hover:shadow-2xl transition-all p-8 flex flex-col gap-6 relative">
                                        <div className="flex items-start justify-between">
                                            <div className="bg-[#161623] p-5 rounded-2xl border border-white/5 shadow-inner">
                                                <Calendar className="h-8 w-8 text-[#929DD8]" />
                                            </div>
                                            {event.linkInfo && (
                                                <Badge className="bg-white/5 text-[#929DD8] border border-white/10 font-black text-[9px] uppercase tracking-widest py-1.5 px-4 rounded-full flex items-center gap-2">
                                                    <Disc className="h-3 w-3 animate-pulse" />
                                                    Prog Linked
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1 mt-2">
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight line-clamp-1">{event.name}</h3>
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                                {format(new Date(event.date), 'EEEE, MMMM do, yyyy')}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 mt-auto pt-4">
                                            <div className="flex flex-col">
                                                <Button 
                                                    variant="ghost" 
                                                    className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-white hover:bg-white/5 px-0 h-8 justify-start"
                                                    onClick={() => handleViewEventAttendance(event)}
                                                >
                                                    View Attendees
                                                </Button>
                                                <span className="text-[10px] font-black text-[#929DD8]">{event.attendeeCount || 0} Check-ins</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <Button 
                                                    className="rounded-2xl h-14 px-6 bg-white/5 border border-white/5 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px]"
                                                    onClick={() => handleMarkAttendance(event)}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-2" /> Mark Now
                                                </Button>
                                                
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white"
                                                    onClick={() => { setQrEvent({ id: event.id, name: event.name }); setIsQRDialogOpen(true); }}
                                                >
                                                    <QrCode className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute top-4 right-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-white opacity-0 group-hover/event:opacity-100 transition-opacity">
                                                        <Maximize2 className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1e1e2e] border-white/5 text-white rounded-xl">
                                                    <DropdownMenuItem onSelect={() => setActiveEventFilter(event)} className="font-bold">
                                                        <FolderOpen className="mr-2 h-4 w-4" /> Open Milestone Folder
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem className="text-red-500 font-bold" onSelect={async () => { await deleteDoc(doc(db, 'groups', groupId, 'events', event.id)); fetchEvents(); }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Log
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-24 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5 mx-4">
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
        <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} totalCount={selectedIds.size || group.peopleIds.length} singlePersonName={selectedIds.size === 1 ? members.find(m => m.id === Array.from(selectedIds)[0])?.fullName : group.name} pausedSession={appUser?.pausedCallingSession} onResumeSession={() => router.push('/session')} />
        <AssignEnablerDialog isOpen={isAssignEnablerDialogOpen} setIsOpen={setIsAssignEnablerDialogOpen} onSave={async (u) => { await assignEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={async (u) => { await assignCoEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} selectedPersonIds={Array.from(selectedIds)} />
        <UpdateContactSourceDialog isOpen={isUpdateSourceDialogOpen} setIsOpen={setIsUpdateSourceDialogOpen} onSave={async (s) => { await updatePeopleContactSource(Array.from(selectedIds), s, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        <ContactGalleryDialog isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} people={members} />
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={async (d) => { const r = await updatePerson(editingPerson.id, d, appUser!); fetchData(undefined, true); return r; }} person={editingPerson} allPeople={members} />}

        <Dialog open={!!viewingEvent} onOpenChange={(o) => !o && setViewingAttendanceRecord(null)}>
            <DialogContent className="sm:max-w-2xl bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-[#1b1d32] border-b border-white/5">
                    <DialogTitle className="text-white font-black uppercase tracking-tight">{viewingEvent?.name} Attendees</DialogTitle>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-slate-500 font-bold text-xs">{attendanceMembers.length} check-ins recorded.</span>
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-8 space-y-4">
                        {isViewingAttendanceLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : attendanceMembers.length > 0 ? (
                            attendanceMembers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-primary/20"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.fullName.charAt(0)}</AvatarFallback></Avatar>
                                        <div><p className="text-white font-black text-sm">{p.fullName}</p><p className="text-slate-500 text-[10px] font-bold">{p.phone}</p></div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => removeAttendance(p.id, groupId, viewingEvent!.id).then(() => handleViewEventAttendance(viewingEvent!))}><Trash2 className="h-4 w-4" /></Button>
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
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input placeholder="Search member name..." className="pl-10 bg-[#161623] border-white/5 text-white rounded-xl h-11" value={attendanceSearchQuery} onChange={e => setAttendanceSearchQuery(e.target.value)} />
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="p-8 space-y-2">
                        {isViewingAttendanceLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : filteredMarkingMembers.length > 0 ? (
                            filteredMarkingMembers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.fullName.charAt(0)}</AvatarFallback></Avatar>
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
