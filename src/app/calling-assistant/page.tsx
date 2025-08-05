
'use client';

import * as React from "react";
import { Loader2, Search, Users, UserCheck, PlusCircle, AlertCircle, PhoneCall, Play } from "lucide-react";
import type { Person, CallStatus, CustomField, Group, AppUser, UserRole, PausedSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { getPeople, updatePerson, assignCoEnablerToPeople } from "@/services/people-service";
import { getCustomPersonFields } from "@/services/settings-service";
import { updateUser } from "@/services/user-service";
import { getAllGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
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
import { AuthGuard } from "@/components/auth-guard";
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


const ROWS_PER_PAGE = 25;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

const CallingAssistantPageComponent = React.memo(function CallingAssistantPageComponent() {
  const { toast } = useToast();
  const { appUser, user, updateCurrentAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allFetchedPeople, setAllFetchedPeople] = React.useState<Person[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = React.useState(1);

  const editingPersonRef = React.useRef<Person | undefined>(undefined);
  const [isEditingDialogOpen, setIsEditingDialogOpen] = React.useState(false);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  
  // Calling Session State
  const [isCallingSessionDialogOpen, setIsCallingSessionDialogOpen] = React.useState(false);
  const [sessionPeople, setSessionPeople] = React.useState<Person[]>([]);
  const [sessionEvent, setSessionEvent] = React.useState('');
  const [sessionCurrentIndex, setSessionCurrentIndex] = React.useState(0);


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

    setCurrentPage(page);
    setSearchTerm(search);
  }, []); // Run only once on mount

  // Update URL when state changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (searchTerm) params.set('search', searchTerm);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, searchTerm, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
    if (!appUser) return;
     setIsDataLoading(true);
      setFetchError(null);
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      try {
        const { people: peopleData, totalCount } = await getPeople(userInfo, { page: currentPage, pageSize: ROWS_PER_PAGE, search: searchTerm });
        setAllFetchedPeople(peopleData);
        setTotalCount(totalCount);

        const [customFieldsData, groupsData] = await Promise.all([
          getCustomPersonFields(userInfo),
          getAllGroups(userInfo),
        ]);
        
        setCustomFields(customFieldsData);
        setGroups(groupsData);

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
  }, [appUser, currentPage, searchTerm]);

  React.useEffect(() => {
    if (appUser) {
      fetchPageData();
    }
  }, [appUser, fetchPageData]);
  
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm]);

  const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE);

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

  // --- Calling Session Logic ---
  const handleStartSession = React.useCallback(async (eventName: string, start: number, end: number) => {
    const { people: peopleForSession } = await getPeople(appUser!, { page: 1, pageSize: end, search: searchTerm });
    const slicedPeople = peopleForSession.slice(start - 1, end);
    
    setSessionPeople(slicedPeople);
    setSessionEvent(eventName);
    setSessionCurrentIndex(0);
    setIsCallingSessionDialogOpen(true);
    setIsConfirmSessionDialogOpen(false);
    if(appUser) updateCurrentAppUser({ currentCallingEvent: eventName });
  }, [appUser, searchTerm, updateCurrentAppUser]);
  
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
    
    const callLog = {
      remark,
      status,
      event: sessionEvent,
      sg,
      ma,
      frp,
      calledAt: 'SERVER_TIMESTAMP',
      callerId: appUser.id,
      callerName: appUser.name,
      callerPhotoUrl: user.photoURL || '',
    };
    
    const updates: Partial<Person> = {
      lastCallRemark: remark,
      lastCallStatus: status,
      lastCallAt: 'SERVER_TIMESTAMP',
      lastSg: sg,
      lastMa: ma,
      lastFrp: frp,
      callHistory: callLog as any,
    };

    try {
      await updatePerson(personId, updates, userInfo);
      toast({
          title: "Call Logged",
          description: `Status for the contact has been updated.`
      });
      
      // Update local state for immediate feedback
      setAllFetchedPeople(prev => prev.map(p => {
          if (p.id === personId) {
              const newHistory = [...(p.callHistory || []), { ...callLog, calledAt: new Date().toISOString() }];
              return { ...p, ...updates, callHistory: newHistory, lastCallAt: new Date().toISOString() };
          }
          return p;
      }));
    } catch (error) {
      console.error("Failed to save session update:", error);
      toast({ variant: 'destructive', title: "Error", description: 'Could not save the call log.' });
      throw error;
    }
  }, [appUser, sessionEvent, user, toast]);

  const handleUpdatePausedSession = React.useCallback((currentIndex: number) => {
    if (!appUser) return;
    const pausedData: PausedSession = {
        eventName: sessionEvent,
        peopleIds: sessionPeople.map(p => p.id),
        currentIndex: currentIndex,
    };
    updateUser(appUser.id, { pausedSession: pausedData });
    updateCurrentAppUser({ pausedSession: pausedData });
  }, [appUser, sessionEvent, sessionPeople, updateCurrentAppUser]);

  const handleSessionNavigate = React.useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next'
      ? Math.min(sessionCurrentIndex + 1, sessionPeople.length - 1)
      : Math.max(sessionCurrentIndex - 1, 0);

    setSessionCurrentIndex(newIndex);
    handleUpdatePausedSession(newIndex);
  }, [sessionCurrentIndex, sessionPeople.length, handleUpdatePausedSession]);

  const handleEndAndClearSession = React.useCallback(async (isSilent = false) => {
    setIsCallingSessionDialogOpen(false);
    if (appUser?.id) {
        await updateUser(appUser.id, { pausedSession: null });
        updateCurrentAppUser({ pausedSession: null });
        if (!isSilent) {
          toast({ title: 'Session Ended', description: 'Your calling session has been cleared.' });
        }
    }
  }, [appUser, toast, updateCurrentAppUser]);

  const handleSessionCloseDialog = React.useCallback(() => {
    if (!appUser) {
        setIsCallingSessionDialogOpen(false);
        return;
    }
    handleUpdatePausedSession(sessionCurrentIndex);
    setIsCallingSessionDialogOpen(false);
    toast({ title: 'Session Paused', description: 'Your session has been saved. You can resume it from this page later.' });
  }, [appUser, sessionCurrentIndex, toast, handleUpdatePausedSession]);

  const handleResumeSession = () => {
    if (!appUser?.pausedSession) return;
    const { eventName, peopleIds, currentIndex } = appUser.pausedSession;
    const resumedPeople = peopleIds.map(id => allFetchedPeople.find(p => p.id === id)).filter(p => p !== undefined) as Person[];
    
    if (resumedPeople.length > 0) {
        setSessionEvent(eventName);
        setSessionPeople(resumedPeople);
        setSessionCurrentIndex(currentIndex);
        setIsCallingSessionDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error Resuming', description: 'Could not find the contacts for the paused session.' });
        handleEndAndClearSession(true); // Clear invalid session
    }
  };

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
        {appUser?.pausedSession && (
             <Alert className="mb-4">
                <Play className="h-4 w-4" />
                <AlertTitle>Resume Paused Session</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    You have a paused calling session for "{appUser.pausedSession.eventName}".
                    <div>
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEndAndClearSession()}>Clear</Button>
                        <Button size="sm" onClick={handleResumeSession}>Resume</Button>
                    </div>
                </AlertDescription>
            </Alert>
        )}
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
                    <Button onClick={() => setIsConfirmSessionDialogOpen(true)} disabled={totalCount === 0}>
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
                {canAssignCoEnabler && <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" />Assign Co-Enabler</Button>}
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto">
                    Deselect All
                </Button>
              </div>
            )}
            
        </div>
        
        <PersonTable
          people={allFetchedPeople}
          allPeopleCount={totalCount}
          onEdit={handleEditPerson}
          onDelete={handleDeletePerson}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          isSelectionActive={isSelectionActive}
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
        totalCount={totalCount}
        onStartSession={handleStartSession}
        searchTerm={searchTerm}
      />

      {isCallingSessionDialogOpen && sessionPeople.length > 0 && (
         <CallingSessionDialog
            isOpen={isCallingSessionDialogOpen}
            onClose={handleSessionCloseDialog}
            onEndSession={handleEndAndClearSession}
            person={sessionPeople[sessionCurrentIndex]}
            currentEvent={sessionEvent}
            onSaveAndNext={handleSessionSave}
            onNavigate={handleSessionNavigate}
            sessionCurrentNumber={sessionCurrentIndex + 1}
            sessionTotalCount={sessionPeople.length}
            customFields={customFields}
            groups={groups}
            allPeople={allFetchedPeople}
            onUpdatePausedSession={handleUpdatePausedSession}
          />
      )}
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
