
'use client';

import * as React from "react";
import { Loader2, Edit, Search, Users, UserCheck, PlusCircle, AlertCircle, PhonePlay } from "lucide-react";
import type { Person, CallStatus, CustomField, Group, AppUser, PausedSession, UserRole } from "@/lib/types";
import { occupationStatuses, callStatuses } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { getPeople, updatePerson, assignCoEnablerToPeople } from "@/services/people-service";
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
import { getFolkGuides, updateUser, getUsers } from "@/services/user-service";
import { getAllGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FilterPopover, type FilterRule, type FilterableField, applyClientSideFilters } from '@/components/filter-popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { ColumnFilterState, applyColumnFilters } from "@/components/column-header-filter";
import { SortPopover, type SortDescriptor } from "@/components/sort-popover";
import { AuthGuard } from "@/components/auth-guard";
import { logAudit } from "@/services/audit-service";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CallingSessionDialog } from '@/components/calling-session-dialog';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';


const ROWS_PER_PAGE = 10;
const FIRESTORE_QUERY_LIMIT = 10000;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

const CallingAssistantPageComponent = React.memo(function CallingAssistantPageComponent() {
  const { toast } = useToast();
  const { appUser, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allFetchedPeople, setAllFetchedPeople] = React.useState<Person[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterState>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedGroupId, setSelectedGroupId] = React.useState('all');

  const editingPersonRef = React.useRef<Person | undefined>(undefined);
  const [isEditingDialogOpen, setIsEditingDialogOpen] = React.useState(false);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  const [isCallingSessionDialogOpen, setIsCallingSessionDialogOpen] = React.useState(false);
  const [sessionPeople, setSessionPeople] = React.useState<Person[]>([]);
  const [sessionEvent, setSessionEvent] = React.useState('');
  const [sessionStartIndex, setSessionStartIndex] = React.useState(0);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const isSelectionActive = selectedIds.size > 0;
  const canAssignCoEnabler = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

   // Set initial state from URL search params
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const page = parseInt(params.get('page') || '1', 10);
    const search = params.get('search') || '';
    const group = params.get('group') || 'all';
    const sort = params.get('sort');
    const filter = params.get('filters');
    const colFilters = params.get('colFilters');

    setCurrentPage(page);
    setSelectedGroupId(group);
    setSearchTerm(search);
    if (sort) {
      try { setSortDescriptors(JSON.parse(sort)); } catch(e) {}
    } else {
      setSortDescriptors([{ field: 'fullName', direction: 'asc' }]);
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
    if (selectedGroupId !== 'all') params.set('group', selectedGroupId);
    if (searchTerm) params.set('search', searchTerm);
    if (sortDescriptors.length > 0 && !(sortDescriptors.length === 1 && sortDescriptors[0].field === 'fullName' && sortDescriptors[0].direction === 'asc')) {
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
  }, [currentPage, selectedGroupId, searchTerm, sortDescriptors, filters, columnFilters, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
    if (!appUser) return;
     setIsDataLoading(true);
      setFetchError(null);
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      try {
        const { people: peopleData } = await getPeople(userInfo, { pageSize: FIRESTORE_QUERY_LIMIT });
        setAllFetchedPeople(peopleData);

        const [enablersData, sourcesData, customFieldsData, groupsData, guidesData] = await Promise.all([
          getEnablers(userInfo, 'filter'),
          getContactSources(userInfo),
          getCustomPersonFields(userInfo),
          getAllGroups(userInfo),
          getFolkGuides(),
        ]);
        
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
        setCustomFields(customFieldsData);
        setGroups(groupsData);
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
  }, [appUser]);

  React.useEffect(() => {
    if (appUser) {
      fetchPageData();
    }
  }, [appUser, fetchPageData]);
  
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, searchTerm, selectedGroupId, columnFilters]);

  const filterableFields: FilterableField[] = React.useMemo(() => {
    return [
      { value: 'nativePlace', label: 'Native Place', type: 'string' },
      { value: 'lastCallStatus', label: 'Call Status', type: 'enum', options: callStatuses.map(s => ({ value: s, label: s })) },
      { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
      { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
      { value: 'lastSg', label: 'SG', type: 'boolean' },
      { value: 'lastMa', label: 'MA', type: 'boolean' },
      { value: 'lastFrp', label: 'FRP', type: 'boolean' },
      { value: 'chantingStatus', label: 'Chanting Rounds', type: 'number' },
      { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
      { value: 'stayingWith', label: 'Staying At', type: 'enum', options: [{value: "PG / Hostel", label: "PG / Hostel"}, {value: "Flat", label: "Flat"}, {value: "Family", label: "Family"}] },
      { value: 'organisation', label: 'Organisation', type: 'string' },
      { value: 'folkGuide', label: 'Folk Guide', type: 'enum', options: folkGuides.map(g => ({ value: g.name, label: `${g.name} (${g.fgCode || 'N/A'})` })) },
    ]
  }, [enablerOptions, contactSourceOptions, folkGuides]);

  const filteredAndSortedPeople = React.useMemo(() => {
    let people = [...allFetchedPeople];

    // Group filter
    if (selectedGroupId !== 'all') {
        const group = groups.find(g => g.id === selectedGroupId);
        if (group) {
            const memberIds = new Set(group.peopleIds);
            people = people.filter(p => memberIds.has(p.id));
        }
    }

    // Search filter
    if (searchTerm.trim()) {
        const lowercasedTerm = searchTerm.toLowerCase();
        people = people.filter(p => 
            p.fullName.toLowerCase().includes(lowercasedTerm) || 
            p.phone.includes(lowercasedTerm)
        );
    }
    
    // Advanced filters
    people = applyClientSideFilters(people, filters);

    // Column filters
    people = applyColumnFilters(people, columnFilters);

    // Sorting
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
  }, [allFetchedPeople, columnFilters, filters, sortDescriptors, searchTerm, selectedGroupId, groups]);

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
    if (selectedIds.size === 0 || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
        await addPeopleToGroup(targetGroupId, Array.from(selectedIds), userInfo);
        toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
        const updatedGroups = await getAllGroups(userInfo);
        setGroups(updatedGroups);
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.' });
    }
  }, [selectedIds, appUser, toast]);

  const handleSaveGroupAndAddMembers = React.useCallback(async (groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">) => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
        const newGroupData: Omit<Group, 'id' | 'createdBy'> = {
            memberCount: 0,
            peopleIds: [],
            ...groupData,
        };
        const newGroup = await createGroup(newGroupData, userInfo);
        
        if (selectedIds.size > 0) {
            await addPeopleToGroup(newGroup.id, Array.from(selectedIds), userInfo);
            toast({
                title: "Group Created & Members Added",
                description: `The group "${newGroup.name}" was created and ${selectedIds.size} contacts were added.`,
            });
            const updatedGroups = await getAllGroups(userInfo);
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
  }, [selectedIds, appUser, toast]);

  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (!appUser || selectedIds.size === 0) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
        await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler, userInfo);
        toast({
            title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned',
            description: `${selectedIds.size} contacts have been updated.`,
        });
        await fetchPageData();
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not assign co-enabler." });
    }
  }, [selectedIds, toast, appUser, fetchPageData]);

  const handleStartSession = React.useCallback((eventName: string, start: number, end: number) => {
    const peopleForSession = filteredAndSortedPeople.slice(start - 1, end);
    setSessionPeople(peopleForSession);
    setSessionEvent(eventName);
    setSessionStartIndex(start - 1);
    setIsCallingSessionDialogOpen(true);
    setIsConfirmSessionDialogOpen(false);
  }, [filteredAndSortedPeople]);

  const handleSessionSave = React.useCallback(async (personId: string, remark: string, status: CallStatus, sg?: boolean, ma?: boolean, frp?: boolean) => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    
    const callLog = {
      remark,
      status,
      event: sessionEvent,
      sg,
      ma,
      frp,
      calledAt: 'SERVER_TIMESTAMP', // Placeholder for server timestamp
      callerId: appUser.id,
      callerName: appUser.name,
      callerPhotoUrl: user?.photoURL || '',
    };
    
    const updates: Partial<Person> = {
      lastCallRemark: remark,
      lastCallStatus: status,
      lastCallAt: 'SERVER_TIMESTAMP',
      lastSg: sg,
      lastMa: ma,
      lastFrp: frp,
      // @ts-ignore
      callHistory: callLog,
    };

    try {
      await updatePerson(personId, updates, userInfo);
    } catch (error) {
      console.error("Failed to save session update:", error);
      throw error; // Re-throw to be caught in the dialog
    }
  }, [appUser, sessionEvent, user]);
  
  const showLimitWarning = filteredAndSortedPeople.length > FIRESTORE_QUERY_LIMIT;

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
        <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or phone..."
                            className="pl-10 w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="w-full sm:w-auto min-w-[180px]">
                            <SelectValue placeholder="Filter by group..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contacts</SelectItem>
                            {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FilterPopover filters={filters} setFilters={setFilters} filterableFields={filterableFields} />
                    <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
                    <Button onClick={() => setIsConfirmSessionDialogOpen(true)} disabled={filteredAndSortedPeople.length === 0}>
                        <PhonePlay className="mr-2 h-4 w-4"/>
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
                {canAssignCoEnabler && <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" />Assign Co-Enabler</Button>}
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto">
                    Deselect All
                </Button>
              </div>
            )}
            {showLimitWarning && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Large Dataset</AlertTitle>
                    <AlertDescription>
                        Your filter matches {filteredAndSortedPeople.length} contacts. The calling session will be created with the first {FIRESTORE_QUERY_LIMIT} contacts due to system limits. Please use more specific filters to narrow down the list.
                    </AlertDescription>
                </Alert>
            )}
        </div>
        
        <PersonTable
          people={paginatedPeople}
          allPeople={filteredAndSortedPeople}
          onEdit={handleEditPerson}
          onDelete={handleDeletePerson}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          isSelectionActive={isSelectionActive}
          sortDescriptors={sortDescriptors}
          setSortDescriptors={setSortDescriptors}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
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
              if (!appUser) return;
              const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
              await updatePerson(editingPersonRef.current!.id, data, userInfo);
              setAllFetchedPeople(prev => prev.map(p => p.id === editingPersonRef.current!.id ? {...p, ...data} : p));
            }}
            person={editingPersonRef.current}
            allPeople={allFetchedPeople}
        />
      )}

      <ConfirmSessionDialog
        isOpen={isConfirmSessionDialogOpen}
        setIsOpen={setIsConfirmSessionDialogOpen}
        people={filteredAndSortedPeople}
        onStartSession={handleStartSession}
      />

      <CallingSessionDialog
          isOpen={isCallingSessionDialogOpen}
          onClose={() => setIsCallingSessionDialogOpen(false)}
          people={sessionPeople}
          currentEvent={sessionEvent}
          groups={groups}
          customFields={customFields}
          onSaveRemark={handleSessionSave}
          totalPeopleCount={filteredAndSortedPeople.length}
          sessionStartIndex={sessionStartIndex}
          context="assistant"
          filters={filters}
          sortDescriptors={sortDescriptors}
          columnFilters={columnFilters}
          searchTerm={searchTerm}
          selectedGroupId={selectedGroupId}
        />
    </div>
  );
});


export default function CallingAssistantPage() {
    return (
        <AuthGuard>
            <CallingAssistantPageComponent />
        </AuthGuard>
    );
}
