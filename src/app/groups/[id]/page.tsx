
'use client';

import * as React from 'react';
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  List,
  LayoutGrid,
  Users,
  UserCheck,
  Trash2,
  Search,
  PlusCircle,
  Headset,
  Edit,
  Play,
} from 'lucide-react';
import type { Person, Group, AppUser, CustomField, CallStatus, UserRole } from '@/lib/types';
import { occupationStatuses, callStatuses } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { getGroup, getStaticGroups, addPeopleToGroup, removePeopleFromGroup } from '@/services/groups-service';
import { getPeople, updatePerson, assignCoEnablerToPeople } from '@/services/people-service';
import { getFolkGuides, updateUser } from '@/services/user-service';
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from '@/services/settings-service';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useAuth } from '@/contexts/auth-context';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonTable } from '@/components/person-table';
import { PersonCard } from '@/components/person-card';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { CallingSessionDialog } from '@/components/calling-session-dialog';
import { ManageGroupMembersDialog } from '@/components/manage-group-members-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { FilterPopover, type FilterRule, type FilterableField, applyClientSideFilters } from '@/components/filter-popover';
import { SortPopover, type SortDescriptor } from '@/components/sort-popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ColumnFilterState, applyColumnFilters } from '@/components/column-header-filter';
import { AuthGuard } from '@/components/auth-guard';
import { logAudit } from '@/services/audit-service';
import { dynamicGroupDefinitions } from '@/lib/dynamic-groups';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';

const ROWS_PER_PAGE = 10;
const FIRESTORE_QUERY_LIMIT = 10000;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

function GroupDetailPageComponent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { appUser, user, updateCurrentAppUser } = useAuth();
  const groupId = params.id as string;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [group, setGroup] = React.useState<Group | null>(null);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);
  const [members, setMembers] = React.useState<Person[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  
  const [view, setView] = React.useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterState>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const canAssignCoEnabler = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const isSelectionActive = selectedIds.size > 0;
  
  const currentCallingEvent = appUser?.currentCallingEvent || "Default Event";
  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [peopleForSession, setPeopleForSession] = React.useState<Person[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [isStartingSessionFlow, setIsStartingSessionFlow] = React.useState(false);
  const [editableEventName, setEditableEventName] = React.useState(currentCallingEvent);
  const [callRange, setCallRange] = React.useState({ from: '1', to: '' });
  const [callRangeNames, setCallRangeNames] = React.useState({ from: '', to: '' });
  const [sessionStartIndex, setSessionStartIndex] = React.useState(0);
  const [initialSessionIndex, setInitialSessionIndex] = React.useState(0);
  const pausedSession = appUser?.pausedSession;
  const canResumeSession = pausedSession?.context === 'group' && pausedSession.selectedGroupId === groupId;

  // Set initial state from URL search params
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const page = parseInt(params.get('page') || '1', 10);
    const view = params.get('view') as 'table' | 'card' || 'table';
    const search = params.get('search') || '';
    const sort = params.get('sort');
    const filter = params.get('filters');
    const colFilters = params.get('colFilters');

    setCurrentPage(page);
    setView(view);
    setSearchTerm(search);
    if (sort) {
      try { setSortDescriptors(JSON.parse(sort)); } catch(e) {}
    } else {
      setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
    }
    if (filter) {
      try { setFilters(JSON.parse(filter)); } catch(e) {}
    }
    if (colFilters) {
      try {
        const parsed = JSON.parse(colFilters);
        // Reconstruct Sets from arrays
        Object.keys(parsed).forEach(key => {
            if (parsed[key].values) {
                parsed[key].values = new Set(parsed[key].values);
            }
        });
        setColumnFilters(parsed);
      } catch(e) {}
    }
  }, []); // Run only once on mount

  // Update URL when state changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (view !== 'table') params.set('view', view);
    if (searchTerm) params.set('search', searchTerm);
    if (sortDescriptors.length > 0 && !(sortDescriptors.length === 1 && sortDescriptors[0].field === 'createdAt' && sortDescriptors[0].direction === 'desc')) {
      params.set('sort', JSON.stringify(sortDescriptors));
    }
    if (filters.length > 0) params.set('filters', JSON.stringify(filters));
    if (Object.keys(columnFilters).length > 0) {
        const serializableFilters = JSON.parse(JSON.stringify(columnFilters, (key, value) => {
            if (value instanceof Set) { return Array.from(value); }
            return value;
        }));
        params.set('colFilters', JSON.stringify(serializableFilters));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, view, searchTerm, sortDescriptors, filters, columnFilters, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
    if (!groupId || !appUser) return;
    setIsLoading(true);
    setFetchError(null);
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
        const groupData = await getGroup(groupId, userInfo);
        if (!groupData) {
             toast({ variant: 'destructive', title: 'Group not found' });
             router.push('/groups');
             return;
        }
        setGroup(groupData);
        
        const { people: allVisiblePeople } = await getPeople(userInfo, { pageSize: FIRESTORE_QUERY_LIMIT });
        setAllPeople(allVisiblePeople);

        let memberData: Person[];
        if (groupData.isDynamic) {
            const dynamicGroupDef = dynamicGroupDefinitions.find(def => def.id === groupId);
            memberData = dynamicGroupDef ? allVisiblePeople.filter(dynamicGroupDef.filter) : [];
        } else {
            const memberIds = new Set(groupData.peopleIds);
            memberData = allVisiblePeople.filter(p => memberIds.has(p.id));
        }
        setMembers(memberData);
        
      const [allGroupsData, enablersData, sourcesData, guidesData, customFieldsData] = await Promise.all([
        getStaticGroups(userInfo),
        getEnablers(userInfo, 'filter'),
        getContactSources(userInfo),
        getFolkGuides(),
        getCustomPersonFields(userInfo),
      ]);
      
      setAllGroups(allGroupsData);
      setEnablerOptions(enablersData);
      setContactSourceOptions(sourcesData);
      setFolkGuides(guidesData);
      setCustomFields(customFieldsData);

    } catch (error) {
      console.error('Failed to load group data', error);
      if (error instanceof Error) setFetchError(error);
      else setFetchError(new Error("An unknown error occurred."));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, appUser, router, toast]);

  React.useEffect(() => {
    if (appUser && groupId) {
      fetchPageData();
    }
  }, [appUser, groupId, fetchPageData]);
  
  const filterableFields: FilterableField[] = React.useMemo(() => [
    { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
    { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
    { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
    { value: 'chantingStatus', label: 'Chanting Rounds', type: 'number' },
    { value: 'stayingWith', label: 'Staying At', type: 'enum', options: [{value: "PG / Hostel", label: "PG / Hostel"}, {value: "Flat", label: "Flat"}, {value: "Family", label: "Family"}] },
    { value: 'organisation', label: 'Organisation', type: 'string' },
    { value: 'folkGuide', label: 'Folk Guide', type: 'enum', options: folkGuides.map(g => ({ value: g.name, label: `${g.name} (${g.fgCode || 'N/A'})` })) },
    { value: 'nativePlace', label: 'Native Place', type: 'string' },
    { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'sgRating', label: 'Rating', type: 'number' },
  ], [enablerOptions, contactSourceOptions, folkGuides]);

  const filteredAndSortedMembers = React.useMemo(() => {
    let people = [...members];
    
    // Apply main search term
    if (searchTerm.trim()) {
        const lowercasedTerm = searchTerm.toLowerCase();
        people = people.filter(p => 
            p.fullName.toLowerCase().includes(lowercasedTerm) || 
            p.phone.includes(lowercasedTerm)
        );
    }

    // Apply advanced filters
    people = applyClientSideFilters(people, filters);

    // Apply column filters
    people = applyColumnFilters(people, columnFilters);

    // Apply sorting
    if (sortDescriptors.length > 0) {
        people.sort((a, b) => {
            for (const desc of sortDescriptors) {
                const valA = a[desc.field as keyof Person];
                const valB = b[desc.field as keyof Person];
                let comparison = 0;
                if (valA === null || valA === undefined) comparison = -1;
                else if (valB === null || valB === undefined) comparison = 1;
                else if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                if (comparison !== 0) {
                    return desc.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }

    return people;
  }, [members, searchTerm, filters, columnFilters, sortDescriptors]);
  
  const totalPages = Math.ceil(filteredAndSortedMembers.length / ROWS_PER_PAGE);
  const paginatedMembers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedMembers.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAndSortedMembers, currentPage]);

  React.useEffect(() => {
    if (!isEventDialogOpen || !isStartingSessionFlow || filteredAndSortedMembers.length === 0) {
      setCallRangeNames({ from: '', to: '' });
      return;
    }
    const handler = setTimeout(() => {
        const fromInput = callRange.from.trim();
        const toInput = callRange.to.trim();
        const fromIndex = parseInt(fromInput, 10) - 1;
        const toIndex = toInput === '' ? filteredAndSortedMembers.length - 1 : parseInt(toInput, 10) - 1;
        let fromName = '';
        if (fromInput && !isNaN(fromIndex) && fromIndex >= 0 && fromIndex < filteredAndSortedMembers.length) {
          fromName = filteredAndSortedMembers[fromIndex]?.fullName || '';
        }
        let toName = '';
        if (!isNaN(toIndex) && toIndex >= 0 && toIndex < filteredAndSortedMembers.length) {
          toName = filteredAndSortedMembers[toIndex]?.fullName || '';
        }
        setCallRangeNames({ from: fromName, to: toName });
    }, 300);
    return () => clearTimeout(handler);
  }, [callRange, filteredAndSortedMembers, isEventDialogOpen, isStartingSessionFlow]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, searchTerm, columnFilters, view]);

  const handleEditPerson = React.useCallback((person: Person) => {
    setEditingPerson(person);
  }, []);
  
  const handleRemoveMembers = React.useCallback(async (idsToRemove: string[]) => {
    if (!group || group.isDynamic || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await removePeopleFromGroup(group.id, idsToRemove, userInfo);
      fetchPageData(); // Refetch data
      toast({
        title: 'Members Removed',
        description: `${idsToRemove.length} contact(s) have been removed from this group.`,
      });
      setSelectedIds(new Set());
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error removing members' });
    }
  }, [group, toast, appUser, fetchPageData]);
  
  const handleSavePersonDialog = React.useCallback(async (personData: Omit<Person, 'id' | 'progress' | 'createdAt'>) => {
    if (!editingPerson || !appUser) return;
    try {
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      await updatePerson(editingPerson.id, personData, userInfo);
      
      const updatedPerson = { ...editingPerson, ...personData };
      setMembers(members.map(m => m.id === updatedPerson.id ? updatedPerson : m));
      setAllPeople(allPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p));

      setEditingPerson(undefined);
      toast({ title: 'Person Updated', description: "The person's details have been saved." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update person details.'});
    }
  }, [editingPerson, members, allPeople, toast, appUser]);
  
  const handleSaveMembers = React.useCallback(async (memberIds: string[]) => {
    if (!group || group.isDynamic || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await addPeopleToGroup(groupId, memberIds, userInfo);
      await fetchPageData(); // Refetch to get updated members
      toast({title: 'Members Updated', description: `Group members for '${group.name}' have been saved.`});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update group members.'});
    }
  }, [group, groupId, toast, appUser, fetchPageData]);
  
  const handleSelectionChange = React.useCallback((personId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(personId);
      else newSet.delete(personId);
      return newSet;
    });
  }, []);

  const handleAddToGroup = React.useCallback(async (targetGroupId: string) => {
    if (selectedIds.size === 0 || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await addPeopleToGroup(targetGroupId, Array.from(selectedIds), userInfo);
      toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.'});
    }
  }, [selectedIds, toast, appUser]);

  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (!appUser || selectedIds.size === 0) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler, userInfo);
      toast({ title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned', description: `${selectedIds.size} contacts have been updated.` });
      fetchPageData(); // Refetch to show changes
      setSelectedIds(new Set());
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not assign co-enabler." });
    }
  }, [selectedIds, toast, fetchPageData, appUser]);

  const handleSessionSave = React.useCallback(async (
    personId: string, 
    remark: string, 
    status: CallStatus, 
    sg: boolean | undefined, 
    ma: boolean | undefined, 
    frp: boolean | undefined
  ) => {
    if (!appUser || !user) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    
    const callHistoryEntry = {
      remark: remark,
      calledAt: new Date().toISOString(),
      status: status,
      event: currentCallingEvent,
      callerId: appUser.id,
      callerName: appUser.name,
      callerPhotoUrl: user.photoURL || '',
      ...(sg !== undefined && { sg }),
      ...(ma !== undefined && { ma }),
      ...(frp !== undefined && { frp }),
    };

    const updateData: any = {
      lastCallRemark: remark,
      lastCallAt: "SERVER_TIMESTAMP",
      lastCallStatus: status,
      callHistory: callHistoryEntry,
    };
    if (sg !== undefined) updateData.lastSg = sg;
    if (ma !== undefined) updateData.lastMa = ma;
    if (frp !== undefined) updateData.lastFrp = frp;

    await updatePerson(personId, updateData, userInfo);
    const updateLocalList = (list: Person[]) => list.map(p => {
        if (p.id === personId) {
            const newHistory = [...(p.callHistory || []), callHistoryEntry];
            const updatedPerson = { ...p, callHistory: newHistory, lastCallRemark: remark, lastCallAt: new Date().toISOString(), lastCallStatus: status, };
            if (sg !== undefined) updatedPerson.lastSg = sg;
            if (ma !== undefined) updatedPerson.lastMa = ma;
            if (frp !== undefined) updatedPerson.lastFrp = frp;
            return updatedPerson;
        }
        return p;
    });
    setMembers(prev => updateLocalList(prev));
    setAllPeople(prev => updateLocalList(prev));
  }, [appUser, user, currentCallingEvent]);
  
  const handleOpenEventDialog = React.useCallback((isStartingFlow: boolean) => {
    setEditableEventName(currentCallingEvent);
    setCallRange({ from: '1', to: String(filteredAndSortedMembers.length) });
    setIsStartingSessionFlow(isStartingFlow);
    setIsEventDialogOpen(true);
  }, [currentCallingEvent, filteredAndSortedMembers.length]);

  const handleSaveEventAndContinue = React.useCallback(async () => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    if (!editableEventName.trim()) {
      toast({ variant: 'destructive', title: 'Event name cannot be empty.' });
      return;
    }
    if (editableEventName !== currentCallingEvent) {
      try {
        await updateUser(appUser.id, { currentCallingEvent: editableEventName }, userInfo);
        updateCurrentAppUser({ currentCallingEvent: editableEventName });
        toast({ title: 'Calling Event Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error updating event.' });
        return; 
      }
    }
    if (isStartingSessionFlow) {
      const fromIndex = parseInt(callRange.from, 10);
      const toIndex = callRange.to.trim() === '' ? filteredAndSortedMembers.length : parseInt(callRange.to, 10);
      if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex < 1 || toIndex > filteredAndSortedMembers.length || fromIndex > toIndex) {
        toast({ variant: 'destructive', title: 'Invalid Range', description: `Please enter a valid range between 1 and ${filteredAndSortedMembers.length}.` });
        return;
      }
      
      const peopleToCall = filteredAndSortedMembers.slice(fromIndex - 1, toIndex);
      
      if (peopleToCall.length === 0) {
        toast({ variant: 'destructive', title: 'No Contacts Selected', description: 'The specified range is empty.' });
        return;
      }
      await logAudit('Start Calling Session', `Started session for group "${group?.name}" with ${peopleToCall.length} contacts.`, userInfo);
      setSessionStartIndex(fromIndex - 1);
      setInitialSessionIndex(0); // Always start new session from beginning
      setPeopleForSession(peopleToCall);
      setIsSessionDialogOpen(true);
    }
    setIsEventDialogOpen(false);
  }, [appUser, editableEventName, currentCallingEvent, isStartingSessionFlow, callRange, filteredAndSortedMembers, toast, updateCurrentAppUser, group]);

  const handleResumeSession = React.useCallback(async () => {
    if (!pausedSession || !canResumeSession || !appUser) return;
    
    setFilters(pausedSession.filters);
    setSortDescriptors(pausedSession.sortDescriptors);
    setSearchTerm(pausedSession.searchTerm);
    setColumnFilters(pausedSession.columnFilters);
    
    // The main filtered list will re-calculate with the new states.
    // We need a short delay to ensure the list is updated before opening the dialog.
    setTimeout(() => {
        const peopleForPausedSession = filteredAndSortedMembers;

        if (peopleForPausedSession.length === 0) {
            toast({ variant: 'destructive', title: 'Could not resume session', description: 'The contacts in the paused session no longer match the filter criteria.'});
            return;
        }

        setPeopleForSession(peopleForPausedSession);
        setSessionStartIndex(pausedSession.sessionStartIndex);
        setInitialSessionIndex(pausedSession.currentIndex);
        setIsSessionDialogOpen(true);
    }, 100);

  }, [pausedSession, canResumeSession, appUser, toast, filteredAndSortedMembers]);

  const renderContent = () => {
    if (isLoading) return <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (fetchError) return <FirebaseConfigError error={fetchError} />;
    if (!group) return null;

    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or phone..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <FilterPopover filters={filters} setFilters={setFilters} filterableFields={filterableFields} />
              <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
            </div>
            <div className="flex items-center gap-2">
              {canResumeSession && (
                  <Button size="sm" onClick={handleResumeSession} variant="outline">
                      <Play className="mr-2 h-4 w-4" />
                      Resume Session ({pausedSession.currentIndex + 1} / {pausedSession.peopleIds.length})
                  </Button>
              )}
              <Button size="sm" onClick={() => handleOpenEventDialog(true)} disabled={filteredAndSortedMembers.length === 0 || isSelectionActive || isLoading}>
                  <Headset className="mr-2 h-4 w-4" />
                  Start Calling Session ({isLoading ? '...' : filteredAndSortedMembers.length})
              </Button>
              <div className="flex items-center rounded-md bg-muted p-1">
                <Button variant={view === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("card")} aria-label="Card View"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("table")} aria-label="Table View"><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          {isSelectionActive && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border">
                <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                {!group.isDynamic && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Add to Group</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allGroups.filter(g => g.id !== groupId && !g.isDynamic).map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {canAssignCoEnabler && <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" /> Assign Co-Enabler</Button>}
                {!group.isDynamic && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove from Group</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove the selected {selectedIds.size} contacts from this group. It will not delete them from the app.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMembers(Array.from(selectedIds))} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto">Deselect All</Button>
              </div>
          )}
        </div>

        {view === 'table' ? (
          <PersonTable 
            people={paginatedMembers} 
            allPeople={filteredAndSortedMembers}
            onEdit={handleEditPerson} 
            onDelete={(id) => handleRemoveMembers([id])} 
            selectedIds={selectedIds} 
            setSelectedIds={setSelectedIds} 
            isSelectionActive={isSelectionActive}
            sortDescriptors={sortDescriptors}
            setSortDescriptors={setSortDescriptors}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />
        ) : (
           paginatedMembers.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedMembers.map((person) => {
                  const personGroups = allGroups.filter(g => g.peopleIds.includes(person.id));
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      isSelected={selectedIds.has(person.id)}
                      onSelectionChange={handleSelectionChange}
                      groups={personGroups}
                      isSelectionActive={isSelectionActive}
                    />
                  )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><p>No members found.</p><p className="text-sm">Try adjusting your search or filters.</p></div>
          )
        )}
        {totalPages > 1 && (
            <Pagination className="mt-8">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="p-2 text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
      </>
    );
  };
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            {group && !fetchError && (
                <PageHeader title={group.name} description={group.description || 'No description for this group.'}>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="w-9 sm:w-auto" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Back</span></Button>
                      {!group.isDynamic && <Button size="sm" className="w-9 sm:w-auto" onClick={() => setIsManageMembersDialogOpen(true)}><UserPlus className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Manage Members</span></Button>}
                    </div>
                </PageHeader>
            )}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
              <AuthGuard>
                {renderContent()}
              </AuthGuard>
            </main>
        </div>
      
      {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={handleSavePersonDialog} person={editingPerson} allPeople={allPeople} />}
      {group && !group.isDynamic && <ManageGroupMembersDialog isOpen={isManageMembersDialogOpen} setIsOpen={setIsManageMembersDialogOpen} onSave={handleSaveMembers} group={group} allPeople={allPeople} />}
      {isAssignCoEnablerDialogOpen && <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={handleAssignCoEnabler} peopleCount={selectedIds.size} />}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isStartingSessionFlow ? 'Confirm Calling Event' : 'Edit Calling Event'}</DialogTitle>
            <DialogDescription>
              {isStartingSessionFlow
                ? 'Confirm the event and optionally specify a range of contacts to call.'
                : 'Update the name of the current calling event.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={editableEventName}
                onChange={(e) => setEditableEventName(e.target.value)}
                className="mt-1"
                placeholder="e.g., Spiritual Camp - July 2024"
              />
            </div>
            {isStartingSessionFlow && (
              <div className="space-y-2">
                <Label>Calling Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                      type="number"
                      placeholder="From"
                      value={callRange.from}
                      onChange={(e) => setCallRange(prev => ({...prev, from: e.target.value}))}
                      min="1"
                      max={filteredAndSortedMembers.length}
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                      type="number"
                      placeholder="To"
                      value={callRange.to}
                      onChange={(e) => setCallRange(prev => ({...prev, to: e.target.value}))}
                      min="1"
                      max={filteredAndSortedMembers.length}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                    Select a range from your filtered list of {filteredAndSortedMembers.length} contacts.
                </p>
                {callRangeNames.from && (
                  <div className="text-xs text-muted-foreground mt-2 border-l-2 border-primary pl-2 space-y-1">
                      <p>From: <strong className="text-foreground">{callRange.from}. {callRangeNames.from}</strong></p>
                      {callRangeNames.to && <p>To: <strong className="text-foreground">{callRange.to || filteredAndSortedMembers.length}. {callRangeNames.to}</strong></p>}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEventAndContinue}>
              {isStartingSessionFlow ? 'Start Session' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CallingSessionDialog
        isOpen={isSessionDialogOpen}
        onClose={() => setIsSessionDialogOpen(false)}
        people={peopleForSession}
        onSaveRemark={handleSessionSave}
        currentEvent={currentCallingEvent}
        customFields={customFields}
        groups={allGroups}
        sessionStartIndex={sessionStartIndex}
        totalPeopleCount={filteredAndSortedMembers.length}
        initialIndex={initialSessionIndex}
        context="group"
        filters={filters}
        sortDescriptors={sortDescriptors}
        searchTerm={searchTerm}
        selectedGroupId={groupId}
        columnFilters={columnFilters}
      />
    </div>
  );
}

export default function GroupDetailPage() {
    return (
        <AuthGuard>
            <GroupDetailPageComponent />
        </AuthGuard>
    )
}
