'use client';

import * as React from "react";
import { Loader2, PlusCircle, PhoneCall, UsersRound, RefreshCw, Trash2, X, AlertCircle } from "lucide-react";
import type { Person, CustomField, Group } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/contexts/toast-context";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { 
  getPeople, 
  updatePerson, 
  createPerson, 
  assignCoEnablerToPeople, 
  assignEnablerToPeople, 
  updatePeopleContactSource, 
  deletePerson as deletePersonSvc,
  deletePeople
} from "@/services/people-service";
import { getCustomPersonFields } from "@/services/settings-service";
import { getAllGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { updateUser } from '@/services/user-service';
import { trackSessionStart } from "@/services/session-history-service";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { AssignEnablerDialog } from '@/components/assign-enabler-dialog';
import { UpdateContactSourceDialog } from '@/components/update-contact-source-dialog';
import { useRouter } from 'next/navigation';
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonTableRowSkeleton } from "@/components/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CallingAssistantPageComponent = () => {
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();
  const router = useRouter();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [totalPeople, setTotalPeople] = React.useState<number | null>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isSelectingAll, setIsSelectingAll] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [lastDocId, setLastDocId] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  const [personToCall, setPersonToCall] = React.useState<Person | null>(null);
  
  const [isStartingSession, setIsStartingSession] = React.useState(false);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState('all');
  
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isAssignEnablerDialogOpen, setIsAssignEnablerDialogOpen] = React.useState(false);
  const [isUpdateSourceDialogOpen, setIsUpdateSourceDialogOpen] = React.useState(false);
  const isSelectionActive = selectedIds.size > 0;

  const fetchData = React.useCallback(async (lastId?: string, silent = false) => {
    if (!appUser) return;
    
    if (lastId) setIsLoadingMore(true);
    else if (!silent) setIsLoading(true);
    
    try {
      const { people: peopleData, totalCount, lastDocId: nextId } = await getPeople(appUser, {
        groupId: selectedGroupId === 'all' ? undefined : selectedGroupId,
        lastDocId: lastId,
      });
      
      setPeople(prev => lastId ? [...prev, ...peopleData] : peopleData);
      setTotalPeople(totalCount);
      setLastDocId(nextId);
      setHasMore(nextId !== null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [appUser, selectedGroupId]);
  
  React.useEffect(() => { fetchData(); }, [fetchData]);
  
  React.useEffect(() => {
    if (!appUser) return;
    const fetchAuxData = async () => {
        const [cf, ag] = await Promise.all([getCustomPersonFields(), getAllGroups(appUser)]);
        setCustomFields(cf);
        setGroups(ag);
    };
    fetchAuxData();
  }, [appUser]);

  const handleSelectAllGlobal = async () => {
    if (!appUser) return;
    setIsSelectingAll(true);
    try {
      const { people: allMatching } = await getPeople(appUser, { 
        groupId: selectedGroupId === 'all' ? undefined : selectedGroupId,
        ignoreLimit: true 
      });
      setSelectedIds(new Set(allMatching.map(p => p.id)));
      toast({ title: 'All Contacts Selected', description: `${allMatching.length} contacts selected.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Selection Failed' });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleStartSession = React.useCallback(async (eventName: string) => {
    if (!appUser) return;
    setIsStartingSession(true);
    try {
        let peopleForSession: Person[];
        let assignedById = appUser.id;
        let assignedByName = appUser.name;

        if (personToCall) {
            peopleForSession = [personToCall];
        } else if (selectedIds.size > 0) {
            const { people: selectedPeople } = await getPeople(appUser, { personIds: Array.from(selectedIds), ignoreLimit: true });
            peopleForSession = selectedPeople;
        } else {
            const { people: allAssigned } = await getPeople(appUser, { 
                groupId: selectedGroupId === 'all' ? undefined : selectedGroupId,
                ignoreLimit: true 
            });
            peopleForSession = allAssigned;
            if (selectedGroupId !== 'all') {
                const group = groups.find(g => g.id === selectedGroupId);
                if (group?.assignedBy) {
                    assignedById = group.assignedBy;
                    assignedByName = group.assignedByName || 'Assignor';
                }
            }
        }

        const coEnablerIds = [...new Set(
            peopleForSession
                .map(p => p.coEnablerId)
                .filter((id): id is string => !!id && id !== appUser.id)
        )];

        const historyId = await trackSessionStart({
            name: eventName,
            peopleIds: peopleForSession.map(p => p.id),
            assignedById,
            assignedByName,
            coEnablerIds
        }, appUser);
        
        const pausedSession = {
            event: eventName,
            peopleIds: peopleForSession.map(p => p.id),
            currentIndex: 0,
            assignedById: assignedById,
            assignedByName: assignedByName,
            historyId: historyId,
            coEnablerIds
        };
        await updateUser(appUser.id, { pausedCallingSession: pausedSession });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: pausedSession} : null);
        router.push('/session');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Session Error' });
    } finally {
        setIsStartingSession(false);
    }
  }, [appUser, setAppUser, personToCall, selectedIds, selectedGroupId, groups, toast, router]);

  const handleBulkDelete = async () => {
    if (!appUser || selectedIds.size === 0) return;
    await deletePeople(Array.from(selectedIds), appUser);
    toast({ title: 'Contacts Deleted' });
    setSelectedIds(new Set());
    fetchData(undefined, true);
  };

  const handleBulkAddToGroup = async (groupId: string) => {
    if (!appUser || selectedIds.size === 0) return;
    await addPeopleToGroup(groupId, Array.from(selectedIds), appUser);
    toast({ title: 'Added to Group' });
    setSelectedIds(new Set());
  };

  if (isLoading && people.length === 0) {
      return <div className="space-y-4 p-4"><Skeleton className="h-10 w-[240px]" /><PersonTableRowSkeleton /></div>;
  }

  return (
    <>
        <PageHeader title="Calling Assistant" description="A focused view to help you call contacts efficiently." />
        <main className="flex-1 p-4 sm:p-6 sm:pt-0">
          {appUser?.pausedCallingSession && (
            <Alert className="mb-4 bg-yellow-100/50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-900/50">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle>Active Session Progress</AlertTitle>
              <AlertDescription>
                You have an ongoing calling session.
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => router.push('/session')}>Resume Session</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    await updateUser(appUser.id, { pausedCallingSession: null });
                    setAppUser(prev => prev ? {...prev, pausedCallingSession: null} : null);
                  }}>Clear Session</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="mb-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                  <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setLastDocId(null); setHasMore(false); }}>
                    <SelectTrigger className="w-[240px]"><UsersRound className="h-4 w-4 mr-2" /><SelectValue placeholder="Filter by Group" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Contacts</SelectItem>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fetchData(undefined)} disabled={isLoading}><RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />Refresh</Button>
                      {!isSelectionActive && (
                          <Button onClick={() => setIsConfirmSessionDialogOpen(true)} disabled={people.length === 0 || isStartingSession}>
                              {isStartingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PhoneCall className="mr-2 h-4 w-4"/>}
                              {isStartingSession ? 'Preparing...' : 'Begin Call Session'}
                          </Button>
                      )}
                  </div>
              </div>
              {isSelectionActive && (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-primary rounded-2xl sticky top-20 z-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3 px-4">
                      <div className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-xs font-black text-primary-foreground shadow-inner uppercase tracking-wider">
                          {selectedIds.size} selected
                      </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-auto pr-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsConfirmSessionDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                          <PhoneCall className="mr-2 h-4 w-4" /> Start Session
                      </Button>
                      
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                  Group
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                              <DropdownMenuItem onSelect={() => setIsCreateGroupDialogOpen(true)}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Add Selected To</DropdownMenuLabel>
                              {groups.filter(g => !g.isDynamic).map(g => (
                                  <DropdownMenuItem key={g.id} onSelect={() => handleBulkAddToGroup(g.id)}>
                                      {g.name}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>

                      <Button variant="ghost" size="sm" onClick={() => setIsAssignEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                          Enabler
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                          Co-Enabler
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => setIsUpdateSourceDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                          Source
                      </Button>

                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="h-10 w-10 font-bold shadow-xl bg-red-600 hover:bg-red-700 rounded-xl shrink-0">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-popover border-none text-foreground rounded-[2rem]">
                              <AlertDialogHeader>
                                  <AlertDialogTitle className="font-black uppercase tracking-tight">Bulk Delete Contacts</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground font-bold">
                                      Are you sure you want to delete {selectedIds.size} selected contacts? This action cannot be undone.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-muted border-border text-foreground rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 rounded-xl font-black uppercase tracking-widest">Delete All</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>

                      <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="h-10 w-10 rounded-xl text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10">
                          <X className="h-5 w-5" />
                      </Button>
                  </div>
                </div>
              )}
          </div>
          <PersonTable 
            people={people} 
            onEdit={setEditingPerson} 
            onDelete={async (id) => { await deletePersonSvc(id, appUser!); fetchData(undefined, true); }} 
            onStartCall={(p) => { setPersonToCall(p); setIsConfirmSessionDialogOpen(true); }} 
            selectedIds={selectedIds} 
            setSelectedIds={setSelectedIds} 
            isSelectionActive={isSelectionActive} 
            allGroups={groups}
            showEnablerColumn={true}
            showCoEnablerColumn={false}
            totalCount={totalPeople}
            onSelectAllGlobal={handleSelectAllGlobal}
            isSelectingAll={isSelectingAll}
          />
          {hasMore && (
              <div className="mt-6 flex justify-center pb-12">
                  <Button 
                      onClick={() => fetchData(lastDocId || undefined)} 
                      disabled={isLoadingMore}
                      variant="outline"
                      className="font-black px-8 h-12 rounded-xl border-border text-foreground bg-muted/50 uppercase tracking-widest text-[10px]"
                  >
                      {isLoadingMore ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more...</>
                      ) : (
                          <>Load More Contacts</>
                      )}
                  </Button>
              </div>
          )}
        </main>
        <CreateUpdateGroupDialog isOpen={isCreateGroupDialogOpen} setIsOpen={setIsCreateGroupDialogOpen} onSave={async (data) => { await createGroup(data, appUser!); fetchData(undefined, true); }} />
        <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={async (u) => { await assignCoEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} selectedPersonIds={Array.from(selectedIds)} />
        <AssignEnablerDialog isOpen={isAssignEnablerDialogOpen} setIsOpen={setIsAssignEnablerDialogOpen} onSave={async (u) => { await assignEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        <UpdateContactSourceDialog isOpen={isUpdateSourceDialogOpen} setIsOpen={setIsUpdateSourceDialogOpen} onSave={async (s) => { await updatePeopleContactSource(Array.from(selectedIds), s, appUser!); fetchData(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={async (d) => { await updatePerson(editingPerson.id, d, appUser!); fetchData(undefined, true); return {success:true}; }} person={editingPerson} allPeople={people} />}
        <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} totalCount={personToCall ? 1 : (isSelectionActive ? selectedIds.size : (totalPeople || 0))} onStartSession={handleStartSession} onResumeSession={() => router.push('/session')} singlePersonName={personToCall?.fullName} pausedSession={appUser?.pausedCallingSession} />
    </>
  );
};

export default function CallingAssistantPage() {
    return <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><CallingAssistantPageComponent /></React.Suspense>;
}
