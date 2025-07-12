
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import type { Person, Group, AppUser, CustomField, CallStatus } from '@/lib/types';
import { occupationStatuses } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getGroup, updateGroup, addPeopleToGroup, getGroups, removePeopleFromGroup } from '@/services/groups-service';
import { getPeople, updatePerson, assignCoEnablerToPeople, deletePeople } from '@/services/people-service';
import { getFolkGuides, updateUser } from '@/services/user-service';
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from '@/services/settings-service';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useAuth } from '@/contexts/auth-context';
import { serverTimestamp, arrayUnion } from 'firebase/firestore';

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
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { FilterPopover, type FilterRule, type FilterableField } from '@/components/filter-popover';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ColumnFilterState, applyColumnFilters } from '@/components/column-header-filter';
import { AuthGuard } from '@/components/auth-guard';
import { logAudit } from '@/services/audit-service';

const ROWS_PER_PAGE = 10;

function GroupDetailPageComponent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { appUser, user, updateCurrentAppUser } = useAuth();
  const groupId = params.id as string;

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
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([{ field: 'createdAt', direction: 'desc' }]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterState>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const canAssignCoEnabler = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = React.useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
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


  const fetchPageData = React.useCallback(async () => {
    if (!groupId || !appUser) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [groupData, peopleData, allGroupsData, enablersData, sourcesData, guidesData, customFieldsData] = await Promise.all([
        getGroup(groupId),
        getPeople(appUser),
        getGroups(appUser),
        getEnablers(appUser, 'filter'),
        getContactSources(appUser),
        getFolkGuides(),
        getCustomPersonFields(appUser),
      ]);

      setAllPeople(peopleData);
      setAllGroups(allGroupsData);
      setEnablerOptions(enablersData);
      setContactSourceOptions(sourcesData);
      setFolkGuides(guidesData);
      setCustomFields(customFieldsData);

      if (groupData) {
        setGroup(groupData);
        const groupMembers = peopleData.filter(p => groupData.peopleIds.includes(p.id));
        setMembers(groupMembers);
      } else {
        toast({ variant: 'destructive', title: 'Group not found' });
        router.push('/groups');
      }
    } catch (error) {
      console.error('Failed to load group data', error);
      if (error instanceof Error) setFetchError(error);
      else setFetchError(new Error("An unknown error occurred."));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, appUser, router, toast]);

  React.useEffect(() => {
    if (appUser) {
      fetchPageData();
    }
  }, [appUser, fetchPageData]);
  
  const filterableFields: FilterableField[] = React.useMemo(() => [
    { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
    { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
    { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
    { value: 'chantingStatus', label: 'Chanting Status', type: 'string' },
    { value: 'stayingWith', label: 'Staying At', type: 'enum', options: [{value: "PG / Hostel", label: "PG / Hostel"}, {value: "Flat", label: "Flat"}, {value: "Family", label: "Family"}] },
    { value: 'organisation', label: 'Organisation', type: 'string' },
    { value: 'folkGuide', label: 'Folk Guide', type: 'enum', options: folkGuides.map(g => ({ value: g.name, label: `${g.name} (${g.fgCode || 'N/A'})` })) },
    { value: 'nativePlace', label: 'Native Place', type: 'string' },
    { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'sgRating', label: 'Rating', type: 'number' },
  ], [enablerOptions, contactSourceOptions, folkGuides]);

  const filteredMembers = React.useMemo(() => {
    let tempPeople = [...members];

    if (searchTerm.trim()) {
        const lowercasedFilter = searchTerm.trim().toLowerCase();
        tempPeople = tempPeople.filter(person => 
            person.fullName.toLowerCase().includes(lowercasedFilter) || 
            person.phone.includes(lowercasedFilter)
        );
    }

    if (filters.length > 0) {
      tempPeople = tempPeople.filter(person => {
        return filters.every(filter => {
          const personValue = person[filter.field as keyof Person];
          if (filter.operator === 'is_empty') return personValue === null || personValue === undefined || personValue === '';
          if (filter.operator === 'is_not_empty') return personValue !== null && personValue !== undefined && personValue !== '';
          if (personValue === null || personValue === undefined) return false;
          const filterValue = filter.value;
          if (typeof filter.value === 'undefined' || filter.value === null || filter.value === '') return true;
          const personString = String(personValue).toLowerCase();
          const filterString = String(filterValue).toLowerCase();

          switch (filter.operator) {
            case 'contains': return personString.includes(filterString);
            case 'not_contains': return !personString.includes(filterString);
            case 'is': return personString === filterString;
            case 'is_not': return personString !== filterString;
            case 'eq': return Number(personValue) === Number(filterValue);
            case 'neq': return Number(personValue) !== Number(filterValue);
            case 'gt': return Number(personValue) > Number(filterValue);
            case 'lt': return Number(personValue) < Number(filterValue);
            case 'gte': return Number(personValue) >= Number(filterValue);
            case 'lte': return Number(personValue) <= Number(filterValue);
            default: return true;
          }
        });
      });
    }
    
    // Apply column filters
    tempPeople = applyColumnFilters(tempPeople, columnFilters);

    return tempPeople.sort((a, b) => {
      for (const { field, direction } of sortDescriptors) {
        const valA = a[field as keyof Person];
        const valB = b[field as keyof Person];
        let comparison = 0;
        if (valA == null && valB != null) comparison = 1;
        else if (valA != null && valB == null) comparison = -1;
        else if (valA == null && valB == null) comparison = 0;
        else if (field === 'createdAt' || field === 'lastCallAt') {
            const dateA = (valA as any)?.toDate ? (valA as any).toDate() : new Date(0);
            const dateB = (valB as any)?.toDate ? (valB as any).toDate() : new Date(0);
            comparison = dateA.getTime() - dateB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, undefined, { numeric: true });
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        if (comparison !== 0) return direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [members, searchTerm, filters, sortDescriptors, columnFilters]);
  
  const paginatedMembers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredMembers.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / ROWS_PER_PAGE);
  
  React.useEffect(() => {
    if (!isEventDialogOpen || !isStartingSessionFlow || filteredMembers.length === 0) {
      setCallRangeNames({ from: '', to: '' });
      return;
    }
    const handler = setTimeout(() => {
        const fromInput = callRange.from.trim();
        const toInput = callRange.to.trim();
        const fromIndex = parseInt(fromInput, 10) - 1;
        const toIndex = toInput === '' ? filteredMembers.length - 1 : parseInt(toInput, 10) - 1;
        let fromName = '';
        if (fromInput && !isNaN(fromIndex) && fromIndex >= 0 && fromIndex < filteredMembers.length) {
          fromName = filteredMembers[fromIndex]?.fullName || '';
        }
        let toName = '';
        if (!isNaN(toIndex) && toIndex >= 0 && toIndex < filteredMembers.length) {
          toName = filteredMembers[toIndex]?.fullName || '';
        }
        setCallRangeNames({ from: fromName, to: toName });
    }, 300);
    return () => clearTimeout(handler);
  }, [callRange, filteredMembers, isEventDialogOpen, isStartingSessionFlow]);

  React.useEffect(() => {
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [filters, sortDescriptors, searchTerm, columnFilters, view]);

  const handleEditPerson = React.useCallback((person: Person) => {
    setEditingPerson(person);
  }, []);
  
  const handleRemoveMembers = React.useCallback(async (idsToRemove: string[]) => {
    if (!group || !appUser) return;
    try {
      await removePeopleFromGroup(group.id, idsToRemove, appUser);
      setMembers(prev => prev.filter(m => !idsToRemove.includes(m.id)));
      setGroup(prev => prev ? { ...prev, peopleIds: prev.peopleIds.filter(id => !idsToRemove.includes(id)), memberCount: prev.memberCount - idsToRemove.length } : null);
      toast({
        title: 'Members Removed',
        description: `${idsToRemove.length} contact(s) have been removed from this group.`,
      });
      setSelectedIds(new Set());
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error removing members' });
    }
  }, [group, toast, appUser]);
  
  const handleSavePersonDialog = React.useCallback(async (personData: Omit<Person, 'id' | 'progress'>) => {
    if (!editingPerson || !appUser) return;
    try {
      await updatePerson(editingPerson.id, personData, appUser);
      const updatedPerson = { ...editingPerson, ...personData };
      setAllPeople(allPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      setMembers(members.map(m => m.id === updatedPerson.id ? updatedPerson : m));
      setEditingPerson(undefined);
      toast({ title: 'Person Updated', description: "The person's details have been saved." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update person details.'});
    }
  }, [editingPerson, allPeople, members, toast, appUser]);
  
  const handleSaveMembers = React.useCallback(async (memberIds: string[]) => {
    if (!group || !appUser) return;
    try {
      const updatedGroupData = { peopleIds: memberIds, memberCount: memberIds.length };
      await updateGroup(groupId, updatedGroupData, appUser);
      const updatedGroup = { ...group, ...updatedGroupData };
      setGroup(updatedGroup);
      setMembers(allPeople.filter(p => memberIds.includes(p.id)));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update group members.'});
    }
  }, [group, groupId, allPeople, toast, appUser]);
  
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
    try {
      await addPeopleToGroup(targetGroupId, Array.from(selectedIds), appUser);
      toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.'});
    }
  }, [selectedIds, toast, appUser]);

  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (!appUser || selectedIds.size === 0) return;
    try {
      await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler, appUser);
      toast({ title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned', description: `${selectedIds.size} contacts have been updated.` });
      fetchPageData(); // Refetch to show changes
      setSelectedIds(new Set());
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not assign co-enabler." });
    }
  }, [selectedIds, toast, fetchPageData, appUser]);

  const handleSessionSave = React.useCallback((
    personId: string, 
    remark: string, 
    status: CallStatus, 
    sg: boolean | undefined, 
    ma: boolean | undefined, 
    frp: boolean | undefined
  ) => {
    if (!appUser || !user) return;
    const callTime = new Date();
    const callHistoryEntry: any = {
      remark: remark, calledAt: callTime, status: status, event: currentCallingEvent,
      callerId: appUser.id, callerName: appUser.name, callerPhotoUrl: user.photoURL || '',
    };
    if (sg !== undefined) callHistoryEntry.sg = sg;
    if (ma !== undefined) callHistoryEntry.ma = ma;
    if (frp !== undefined) callHistoryEntry.frp = frp;
    const updateData: any = {
      lastCallRemark: remark, lastCallAt: serverTimestamp(), lastCallStatus: status, callHistory: arrayUnion(callHistoryEntry),
    };
    if (sg !== undefined) updateData.lastSg = sg;
    if (ma !== undefined) updateData.lastMa = ma;
    if (frp !== undefined) updateData.lastFrp = frp;
    updatePerson(personId, updateData);
    setMembers(prev => prev.map(p => {
        if (p.id === personId) {
            const newHistory = p.callHistory ? [...p.callHistory, callHistoryEntry] : [callHistoryEntry];
            const updatedPerson = { ...p, callHistory: newHistory, lastCallRemark: remark, lastCallAt: callTime, lastCallStatus: status, };
            if (sg !== undefined) updatedPerson.lastSg = sg;
            if (ma !== undefined) updatedPerson.lastMa = ma;
            if (frp !== undefined) updatedPerson.lastFrp = frp;
            return updatedPerson;
        }
        return p;
    }));
  }, [appUser, user, currentCallingEvent]);
  
  const handleOpenEventDialog = React.useCallback((isStartingFlow: boolean) => {
    setEditableEventName(currentCallingEvent);
    setCallRange({ from: '1', to: String(filteredMembers.length) });
    setIsStartingSessionFlow(isStartingFlow);
    setIsEventDialogOpen(true);
  }, [currentCallingEvent, filteredMembers.length]);

  const handleSaveEventAndContinue = React.useCallback(async () => {
    if (!appUser) return;
    if (!editableEventName.trim()) {
      toast({ variant: 'destructive', title: 'Event name cannot be empty.' });
      return;
    }
    if (editableEventName !== currentCallingEvent) {
      try {
        await updateUser(appUser.id, { currentCallingEvent: editableEventName }, appUser);
        updateCurrentAppUser({ currentCallingEvent: editableEventName });
        toast({ title: 'Calling Event Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error updating event.' });
        return; 
      }
    }
    if (isStartingSessionFlow) {
      const fromIndex = parseInt(callRange.from, 10);
      const toIndex = callRange.to.trim() === '' ? filteredMembers.length : parseInt(callRange.to, 10);
      if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex < 1 || toIndex > filteredMembers.length || fromIndex > toIndex) {
        toast({ variant: 'destructive', title: 'Invalid Range', description: `Please enter a valid range between 1 and ${filteredMembers.length}.` });
        return;
      }
      const peopleToCall = filteredMembers.slice(fromIndex - 1, toIndex);
      if (peopleToCall.length === 0) {
        toast({ variant: 'destructive', title: 'No Contacts Selected', description: 'The specified range is empty.' });
        return;
      }
      await logAudit('Start Calling Session', `Started session for group "${group?.name}" with ${peopleToCall.length} contacts.`, appUser);
      setSessionStartIndex(fromIndex - 1);
      setInitialSessionIndex(0); // Always start new session from beginning
      setPeopleForSession(peopleToCall);
      setIsSessionDialogOpen(true);
    }
    setIsEventDialogOpen(false);
  }, [appUser, editableEventName, currentCallingEvent, isStartingSessionFlow, callRange, filteredMembers, toast, updateCurrentAppUser, group]);

  const handleResumeSession = React.useCallback(() => {
    if (!pausedSession || !canResumeSession) return;
    
    // On the group page, we don't restore filters/search from a potentially different context.
    // We just find the people from the paused list that exist in THIS group.
    
    const peopleMap = new Map(allPeople.map(p => [p.id, p]));
    const peopleForPausedSession = pausedSession.peopleIds
        .map(id => peopleMap.get(id))
        .filter((p): p is Person => !!p);

    if (peopleForPausedSession.length !== pausedSession.peopleIds.length) {
        toast({
            variant: 'destructive',
            title: 'Could not resume session',
            description: 'Some contacts in the paused session no longer exist or are inaccessible.'
        });
        return;
    }

    setPeopleForSession(peopleForPausedSession);
    setSessionStartIndex(pausedSession.sessionStartIndex);
    setInitialSessionIndex(pausedSession.currentIndex);
    setIsSessionDialogOpen(true);

  }, [pausedSession, canResumeSession, allPeople, toast]);

  const renderContent = () => {
    if (isLoading) return <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (fetchError) return <FirebaseConfigError error={fetchError} />;
    if (!group) return null;

    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {isSelectionActive ? (
                <>
                  <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Add to Group</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allGroups.filter(g => g.id !== groupId).map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {canAssignCoEnabler && <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" /> Assign Co-Enabler</Button>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove from Group</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove the selected {selectedIds.size} contacts from this group. It will not delete them from the app.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMembers(Array.from(selectedIds))} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or phone..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  <FilterPopover filters={filters} setFilters={setFilters} filterableFields={filterableFields} />
                  <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
                </>
              )}
               {filteredMembers.length > 0 && <Button variant="outline" size="sm" onClick={() => { if (selectedIds.size === filteredMembers.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filteredMembers.map(p => p.id))); } }}>{selectedIds.size === filteredMembers.length ? 'Deselect All' : 'Select All'}</Button>}
            </div>
            <div className="flex items-center gap-2">
              {canResumeSession && (
                  <Button size="sm" onClick={handleResumeSession} variant="outline">
                      <Play className="mr-2 h-4 w-4" />
                      Resume Session ({pausedSession.currentIndex + 1} / {pausedSession.peopleIds.length})
                  </Button>
              )}
              <Button size="sm" onClick={() => handleOpenEventDialog(true)} disabled={filteredMembers.length === 0 || isSelectionActive || isLoading}>
                  <Headset className="mr-2 h-4 w-4" />
                  Start Calling Session ({isLoading ? '...' : filteredMembers.length})
              </Button>
              <div className="flex items-center rounded-md bg-muted p-1">
                <Button variant={view === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("card")} aria-label="Card View"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("table")} aria-label="Table View"><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><p>No members found.</p><p className="text-sm">Try adjusting your search or filters.</p></div>
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedMembers.map((person) => <PersonCard key={person.id} person={person} isSelected={selectedIds.has(person.id)} onSelectionChange={handleSelectionChange} groups={allGroups.filter(g => g.peopleIds.includes(person.id))} isSelectionActive={isSelectionActive} />)}
          </div>
        ) : (
          <PersonTable 
            people={paginatedMembers} 
            onEdit={handleEditPerson} 
            onDelete={(id) => handleRemoveMembers([id])} 
            selectedIds={selectedIds} 
            setSelectedIds={setSelectedIds} 
            isSelectionActive={isSelectionActive}
            sortDescriptors={sortDescriptors}
            setSortDescriptors={setSortDescriptors}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
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
                      <Button variant="outline" size="sm" className="w-9 sm:w-auto" onClick={() => router.push('/groups')}><ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Back to Groups</span></Button>
                      <Button size="sm" className="w-9 sm:w-auto" onClick={() => setIsManageMembersDialogOpen(true)}><UserPlus className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Manage Members</span></Button>
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
      {group && <ManageGroupMembersDialog isOpen={isManageMembersDialogOpen} setIsOpen={setIsManageMembersDialogOpen} onSave={handleSaveMembers} group={group} allPeople={allPeople} />}
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
                      max={filteredMembers.length}
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                      type="number"
                      placeholder="To"
                      value={callRange.to}
                      onChange={(e) => setCallRange(prev => ({...prev, to: e.target.value}))}
                      min="1"
                      max={filteredMembers.length}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                    Select a range from your filtered list of {filteredMembers.length} contacts.
                </p>
                {callRangeNames.from && (
                  <div className="text-xs text-muted-foreground mt-2 border-l-2 border-primary pl-2 space-y-1">
                      <p>From: <strong className="text-foreground">{callRange.from}. {callRangeNames.from}</strong></p>
                      {callRangeNames.to && <p>To: <strong className="text-foreground">{callRange.to || filteredMembers.length}. {callRangeNames.to}</strong></p>}
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
        totalPeopleCount={filteredMembers.length}
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
