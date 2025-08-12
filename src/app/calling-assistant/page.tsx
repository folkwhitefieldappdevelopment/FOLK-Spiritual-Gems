
'use client';

import * as React from "react";
import { Loader2, Users, UserCheck, PlusCircle, AlertCircle, PhoneCall, Search } from "lucide-react";
import type { Person, CallStatus, CustomField, Group, AppUser, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { getPeople, updatePerson, assignCoEnablerToPeople } from "@/services/people-service";
import { getCustomPersonFields, getEnablers, getContactSources, getOccupationStatuses, getStayingWithOptions, type EnablerOption } from "@/services/settings-service";
import { getAllGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { getFolkGuides, updateUser } from '@/services/user-service';
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CallingSessionDialog } from '@/components/calling-session-dialog';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { applyClientSideFilters, type FilterState } from '@/lib/filters';
import { get } from 'lodash';
import { Input } from "@/components/ui/input";
import { SortPopover, type SortDescriptor } from "@/components/sort-popover";
import { FilterPopover, type FilterRule, type FilterableField } from "@/components/filter-popover";


const ROWS_PER_PAGE = 25;
const FIRESTORE_QUERY_LIMIT = 10000;

const CallingAssistantPageComponent = React.memo(function CallingAssistantPageComponent() {
  const { toast } = useToast();
  const { appUser, setAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allFetchedPeople, setAllFetchedPeople] = React.useState<Person[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [tableFilters, setTableFilters] = React.useState<FilterState>({});
  const [globalSearch, setGlobalSearch] = React.useState('');
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([]);
  const [advancedFilters, setAdvancedFilters] = React.useState<FilterRule[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = React.useState(1);

  const editingPersonRef = React.useRef<Person | undefined>(undefined);
  const [isEditingDialogOpen, setIsEditingDialogOpen] = React.useState(false);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  
  const [isCallingSessionDialogOpen, setIsCallingSessionDialogOpen] = React.useState(false);
  const [sessionPeople, setSessionPeople] = React.useState<Person[]>([]);
  const [sessionEvent, setSessionEvent] = React.useState('');
  const [sessionCurrentIndex, setSessionCurrentIndex] = React.useState(0);
  const [hasPausedSession, setHasPausedSession] = React.useState(false);


  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [occupationOptions, setOccupationOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const isSelectionActive = selectedIds.size > 0;
  
   React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const page = parseInt(params.get('page') || '1', 10);
    const sort = params.get('sort');
    const tableFilter = params.get('tableFilters');
    const advancedFilter = params.get('advancedFilters');
    const search = params.get('search');

    setCurrentPage(page);
    if (sort) {
      try { setSortDescriptors(JSON.parse(sort)); } catch(e) {}
    } else {
      setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
    }
    if (tableFilter) {
      try { setTableFilters(JSON.parse(tableFilter)); } catch(e) {}
    }
    if(advancedFilter) {
      try { setAdvancedFilters(JSON.parse(advancedFilter)); } catch(e) {}
    }
    if(search) {
      setGlobalSearch(search);
    }
  }, []); 

  React.useEffect(() => {
    setHasPausedSession(!!appUser?.pausedCallingSession);
  }, [appUser]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (sortDescriptors.length > 0 && !(sortDescriptors.length === 1 && sortDescriptors[0].field === 'createdAt' && sortDescriptors[0].direction === 'desc')) {
      params.set('sort', JSON.stringify(sortDescriptors));
    }
    if (Object.keys(tableFilters).length > 0) {
        params.set('tableFilters', JSON.stringify(tableFilters));
    }
     if (advancedFilters.length > 0) {
        params.set('advancedFilters', JSON.stringify(advancedFilters));
    }
    if (globalSearch) {
        params.set('search', globalSearch);
    }
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, sortDescriptors, tableFilters, advancedFilters, globalSearch, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
     setIsDataLoading(true);
      setFetchError(null);
      try {
        const { people: peopleData } = await getPeople({ pageSize: FIRESTORE_QUERY_LIMIT });
        setAllFetchedPeople(peopleData);

        const [customFieldsData, groupsData, enablersData, sourcesData, occupationsData, stayingsData, guidesData] = await Promise.all([
          getCustomPersonFields(),
          getAllGroups(),
          getEnablers('filter'),
          getContactSources(),
          getOccupationStatuses(),
          getStayingWithOptions(),
          getFolkGuides(),
        ]);
        
        setCustomFields(customFieldsData);
        setGroups(groupsData);
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
        setOccupationOptions(occupationsData);
        setStayingWithOptions(stayingsData);
        setFolkGuides(guidesData);

      } catch (error) {
        console.error("Failed to load data:", error);
        if (error instanceof Error) {
            setFetchError(error);
        } else {
            setFetchError(new Error("An unknown error occurred while fetching data."));
        }
      } finally {
        setIsDataLoading(false);
      }
  }, []);

  React.useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [tableFilters, sortDescriptors, globalSearch, advancedFilters]);
  
  const filteredAndSortedPeople = React.useMemo(() => {
    let people = applyClientSideFilters(allFetchedPeople, tableFilters, globalSearch, advancedFilters);

    if (sortDescriptors.length > 0) {
        people.sort((a, b) => {
            for (const desc of sortDescriptors) {
                const valA = get(a, desc.field);
                const valB = get(b, desc.field);
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
  }, [allFetchedPeople, tableFilters, sortDescriptors, globalSearch, advancedFilters]);

  const totalPages = Math.ceil(filteredAndSortedPeople.length / ROWS_PER_PAGE);
  const paginatedPeople = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedPeople.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAndSortedPeople, currentPage]);

  const handleEditPerson = React.useCallback((person: Person) => {
    editingPersonRef.current = person;
    setIsEditingDialogOpen(true);
  }, []);
  
  const handleDeletePerson = React.useCallback(() => {
    toast({
        title: "Action Disabled",
        description: "Please go to the main Contacts page to delete a contact.",
    });
  }, [toast]);
  
  const handleAddToGroup = React.useCallback(async (targetGroupId: string) => {
    if (selectedIds.size === 0) return;
    try {
        await addPeopleToGroup(targetGroupId, Array.from(selectedIds));
        toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
        const updatedGroups = await getAllGroups();
        setGroups(updatedGroups);
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.' });
    }
  }, [selectedIds, toast]);

  const handleSaveGroupAndAddMembers = React.useCallback(async (groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">) => {
    try {
        const newGroupData: Omit<Group, 'id' | 'createdBy'> = {
            memberCount: 0,
            peopleIds: [],
            ...groupData,
        };
        const newGroup = await createGroup(newGroupData);
        
        if (selectedIds.size > 0) {
            await addPeopleToGroup(newGroup.id, Array.from(selectedIds));
            toast({
                title: "Group Created & Members Added",
                description: `The group "${newGroup.name}" was created and ${selectedIds.size} contacts were added.`,
            });
            const updatedGroups = await getAllGroups();
            setGroups(updatedGroups);
            setSelectedIds(new Set());
        } else {
            toast({
                title: "Group Created",
                description: `The new group "${newGroup.name}" has been added.`,
            });
             setGroups((prev) => [...prev, newGroup]);
        }
        setIsCreateGroupDialogOpen(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create or add members to the new group.",
        });
    }
  }, [selectedIds, toast]);

  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (selectedIds.size === 0) return;
    try {
        await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler);
        toast({
            title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned',
            description: `${selectedIds.size} contacts have been updated.`,
        });
        await fetchPageData();
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not assign co-enabler." });
    }
  }, [selectedIds, toast, fetchPageData]);

  const handleStartSession = React.useCallback(async (eventName: string, start: number, end: number) => {
    const slicedPeople = filteredAndSortedPeople.slice(start - 1, end);
    const slicedPeopleIds = slicedPeople.map(p => p.id);
    
    setSessionPeople(slicedPeople);
    setSessionEvent(eventName);
    setSessionCurrentIndex(0);
    setIsCallingSessionDialogOpen(true);
    setIsConfirmSessionDialogOpen(false);

    if (appUser) {
        const pausedSession = {
            event: eventName,
            peopleIds: slicedPeopleIds,
            currentIndex: 0,
        };
        await updateUser(appUser.id, { pausedCallingSession: pausedSession });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: pausedSession} : null);
    }
  }, [filteredAndSortedPeople, appUser, setAppUser]);
  
  const handleSessionSave = React.useCallback(async (
    personId: string,
    remark: string,
    status: CallStatus,
    sg: boolean | undefined,
    ma: boolean | undefined,
    frp: boolean | undefined
  ) => {
    if (!appUser) return;
    
    const callLog: Person['callHistory'][number] = {
      remark,
      status,
      event: sessionEvent,
      sg,
      ma,
      frp,
      callerId: appUser.id,
      callerName: appUser.name,
      callerPhotoUrl: appUser.photoUrl || '',
      calledAt: new Date(),
    };
    
    const updates: Partial<Person> = {
      lastCallRemark: remark,
      lastCallStatus: status,
      lastCallAt: callLog.calledAt,
      lastSg: sg,
      lastMa: ma,
      lastFrp: frp,
      callHistory: callLog,
    };

    try {
      await updatePerson(personId, updates);
      toast({
          title: "Call Logged",
          description: `Status for the contact has been updated.`
      });
      
      setAllFetchedPeople(prev => prev.map(p => {
          if (p.id === personId) {
              const newHistory = [...(p.callHistory || []), { ...callLog, calledAt: (callLog.calledAt as Date).toISOString() }];
              return { ...p, ...updates, lastCallAt: (callLog.calledAt as Date).toISOString(), callHistory: newHistory };
          }
          return p;
      }));
    } catch (error) {
      console.error("Failed to save session update:", error);
      toast({ variant: 'destructive', title: "Error", description: 'Could not save the call log.' });
      throw error;
    }
  }, [appUser, sessionEvent, toast]);

  const handleSessionNavigate = (direction: 'next' | 'prev') => {
    setSessionCurrentIndex(prev => {
        if (direction === 'next') return Math.min(prev + 1, sessionPeople.length - 1);
        return Math.max(prev - 1, 0);
    });
  };

  const handleEndSession = async () => {
    setIsCallingSessionDialogOpen(false);
    if (appUser) {
        await updateUser(appUser.id, { pausedCallingSession: null });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: null} : null);
    }
    toast({
        title: 'Session Ended',
        description: 'Your calling session has been completed.',
    });
  };
  
  const handleResumeSession = () => {
    if (!appUser?.pausedCallingSession) return;
    const { event, peopleIds, currentIndex } = appUser.pausedCallingSession;
    const peopleMap = new Map(allFetchedPeople.map(p => [p.id, p]));
    const resumedPeople = peopleIds.map(id => peopleMap.get(id)).filter(Boolean) as Person[];
    
    if (resumedPeople.length > 0) {
      setSessionPeople(resumedPeople);
      setSessionEvent(event);
      setSessionCurrentIndex(currentIndex);
      setIsCallingSessionDialogOpen(true);
    } else {
      toast({ variant: 'destructive', title: 'Error Resuming', description: 'Could not find the contacts for the paused session.' });
      handleClearSession();
    }
  };
  
  const handleClearSession = async () => {
    if (!appUser) return;
    await updateUser(appUser.id, { pausedCallingSession: null });
    setAppUser(prev => prev ? {...prev, pausedCallingSession: null} : null);
    setHasPausedSession(false); 
    toast({ title: 'Session Cleared', description: 'Your paused session has been cleared.'});
  };
  
  const filterableFields: FilterableField[] = React.useMemo(() => [
    { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationOptions.map(o => ({ value: o, label: o })) },
    { value: 'stayingWith', label: 'Staying With', type: 'enum', options: stayingWithOptions.map(o => ({ value: o, label: o })) },
    { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(o => ({ value: o, label: o }))},
    { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions.map(o => ({ value: o.value, label: o.label })) },
    { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'sgRating', label: 'Rating', type: 'number' },
    { value: 'chantingStatus', label: 'Chanting Rounds', type: 'number' },
  ], [occupationOptions, stayingWithOptions, contactSourceOptions, enablerOptions]);


  const renderContent = () => {
    if (isDataLoading) {
        return (
            <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (fetchError) {
      return <FirebaseConfigError error={fetchError} />;
    }

    return (
      <>
        {hasPausedSession && (
          <Alert variant="default" className="mb-4 bg-yellow-100/50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-300">Paused Session Found</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              You have a calling session that was not completed.
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={handleResumeSession}>Resume Session</Button>
                <Button size="sm" variant="outline" onClick={handleClearSession}>Clear Session</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contacts..."
                        className="pl-10 w-full sm:w-64"
                        value={globalSearch}
                        onChange={e => setGlobalSearch(e.target.value)}
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <FilterPopover filters={advancedFilters} setFilters={setAdvancedFilters} filterableFields={filterableFields} />
                    <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
                    <Button onClick={() => setIsConfirmSessionDialogOpen(true)} disabled={filteredAndSortedPeople.length === 0}>
                        <PhoneCall className="mr-2 h-4 w-4"/>
                        Begin Call Session
                    </Button>
                 </div>
            </div>

            {isSelectionActive && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border">
                <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Add to Group</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {groups.filter(g => !g.isDynamic).map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                        {groups.filter(g => !g.isDynamic).length > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onSelect={() => setIsCreateGroupDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Group
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" />Assign Co-Enabler</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto">
                    Deselect All
                </Button>
              </div>
            )}
            
        </div>
        
        <PersonTable
          people={paginatedPeople}
          allPeople={filteredAndSortedPeople}
          allPeopleCount={filteredAndSortedPeople.length}
          onEdit={handleEditPerson}
          onDelete={handleDeletePerson}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          isSelectionActive={isSelectionActive}
          sortDescriptors={sortDescriptors}
          setSortDescriptors={setSortDescriptors}
          filters={tableFilters}
          setFilters={setTableFilters}
        />
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
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader
            title="Calling Assistant"
            description="A focused view to help you call contacts efficiently."
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
            {renderContent()}
          </main>
      </div>
      
      <CreateUpdateGroupDialog
          isOpen={isCreateGroupDialogOpen}
          setIsOpen={setIsCreateGroupDialogOpen}
          onSave={handleSaveGroupAndAddMembers}
      />
      
      <AssignCoEnablerDialog
        isOpen={isAssignCoEnablerDialogOpen}
        setIsOpen={setIsAssignCoEnablerDialogOpen}
        onSave={handleAssignCoEnabler}
        peopleCount={selectedIds.size}
      />

      {editingPersonRef.current && (
         <CreateUpdatePersonDialog
            isOpen={isEditingDialogOpen}
            setIsOpen={(isOpen) => {
              if (!isOpen) editingPersonRef.current = undefined;
              setIsEditingDialogOpen(isOpen);
            }}
            onSave={async (data) => {
              await updatePerson(editingPersonRef.current!.id, data);
              setAllFetchedPeople(prev => prev.map(p => p.id === editingPersonRef.current!.id ? {...p, ...data} : p));
            }}
            person={editingPersonRef.current}
            allPeople={allFetchedPeople}
        />
      )}

      <ConfirmSessionDialog
        isOpen={isConfirmSessionDialogOpen}
        setIsOpen={setIsConfirmSessionDialogOpen}
        totalCount={filteredAndSortedPeople.length}
        onStartSession={handleStartSession}
      />

      {isCallingSessionDialogOpen && sessionPeople.length > 0 && (
         <CallingSessionDialog
            isOpen={isCallingSessionDialogOpen}
            onClose={() => setIsCallingSessionDialogOpen(false)}
            onEndSession={handleEndSession}
            person={sessionPeople[sessionCurrentIndex]}
            currentEvent={sessionEvent}
            onSaveAndNext={handleSessionSave}
            onNavigate={handleSessionNavigate}
            sessionCurrentNumber={sessionCurrentIndex + 1}
            sessionTotalCount={sessionPeople.length}
            customFields={customFields}
            groups={groups}
            sessionPeopleIds={sessionPeople.map(p => p.id)}
          />
      )}
    </div>
  );
});


export default function CallingAssistantPage() {
    return (
        <CallingAssistantPageComponent />
    );
}
