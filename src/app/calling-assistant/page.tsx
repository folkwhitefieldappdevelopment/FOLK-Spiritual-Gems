
"use client";

import * as React from "react";
import { Headset, Loader2, Edit, Search, Users, UserCheck, PlusCircle } from "lucide-react";
import type { Person, CallStatus, CustomField, Group, AppUser } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { callStatuses } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { CallingSessionDialog } from "@/components/calling-session-dialog";
import { AuthGuard } from "@/components/auth-guard";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { getPeople, updatePerson, assignHelperToPeople } from "@/services/people-service";
import { getEnablers, getContactSources, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
import { getGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { updateUser } from "@/services/user-service";
import { serverTimestamp, arrayUnion } from "firebase/firestore";
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
import { FilterPopover, type FilterRule, type FilterableField } from '@/components/filter-popover';
import { SortPopover, type SortDescriptor } from '@/components/sort-popover';
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
import { AssignHelperDialog } from '@/components/assign-helper-dialog';
import { ColumnFilterState, applyColumnFilters } from "@/components/column-header-filter";

export default function CallingAssistantPage() {
  const { toast } = useToast();
  const { appUser, user, updateCurrentAppUser } = useAuth();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [peopleForSession, setPeopleForSession] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([{ field: 'lastCallAt', direction: 'asc' }]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterState>({});

  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('all');
  const [currentCallingEvent, setCurrentCallingEvent] = React.useState("Loading event...");
  
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignHelperDialogOpen, setIsAssignHelperDialogOpen] = React.useState(false);
  const isSelectionActive = selectedIds.size > 0;
  const canAssignHelper = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [isStartingSessionFlow, setIsStartingSessionFlow] = React.useState(false);
  const [editableEventName, setEditableEventName] = React.useState("");
  const [callRange, setCallRange] = React.useState({ from: '1', to: '' });
  const [callRangeNames, setCallRangeNames] = React.useState({ from: '', to: '' });
  const [sessionStartIndex, setSessionStartIndex] = React.useState(0);

  const fetchPageData = React.useCallback(async () => {
    if (!appUser) return;
     setIsLoading(true);
      setFetchError(null);
      try {
        const [peopleData, enablersData, sourcesData, customFieldsData, groupsData] = await Promise.all([
          getPeople(appUser),
          getEnablers(appUser, 'filter'),
          getContactSources(),
          getCustomPersonFields(),
          getGroups(appUser),
        ]);
        setPeople(peopleData);
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
        setCustomFields(customFieldsData);
        setGroups(groupsData);
        if (appUser.currentCallingEvent) {
            setCurrentCallingEvent(appUser.currentCallingEvent);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        if (error instanceof Error) {
            setFetchError(error);
        } else {
            setFetchError(new Error("An unknown error occurred while fetching data."));
        }
      } finally {
        setIsLoading(false);
      }
  }, [appUser]);

  React.useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, searchTerm, selectedGroupId, columnFilters]);

  const filterableFields: FilterableField[] = React.useMemo(() => {
    return [
      { value: 'fullName', label: 'Name', type: 'string' },
      { value: 'phone', label: 'Phone', type: 'string' },
      { value: 'nativePlace', label: 'Native Place', type: 'string' },
      { value: 'lastCallStatus', label: 'Call Status', type: 'enum', options: callStatuses.map(s => ({ value: s, label: s })) },
      { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
      { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
      { value: 'lastSg', label: 'SG Attended', type: 'boolean' },
      { value: 'lastMa', label: 'MA Attended', type: 'boolean' },
      { value: 'lastFrp', label: 'FRP Attended', type: 'boolean' },
      { value: 'chantingStatus', label: 'Chanting Status', type: 'string' },
      { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
      { value: 'assignedHelperName', label: 'Assigned Helper', type: 'string' },
    ]
  }, [enablerOptions, contactSourceOptions]);


  const filteredPeople = React.useMemo(() => {
    let tempPeople = [...people];

    // Apply group filter
    if (selectedGroupId && selectedGroupId !== 'all') {
        const group = groups.find(g => g.id === selectedGroupId);
        if (group) {
            const memberIds = new Set(group.peopleIds);
            tempPeople = tempPeople.filter(p => memberIds.has(p.id));
        }
    }

    // Apply search filter
    if (searchTerm.trim()) {
        const lowercasedFilter = searchTerm.trim().toLowerCase();
        tempPeople = tempPeople.filter(person => {
            return (
                person.fullName.toLowerCase().includes(lowercasedFilter) ||
                person.phone.includes(lowercasedFilter)
            );
        });
    }

    // Apply advanced filters
    if (filters.length > 0) {
      tempPeople = tempPeople.filter(person => {
        return filters.every(filter => {
          const personValue = person[filter.field as keyof Person];

          // Special handling for 'Unassigned' enabler
          if (filter.field === 'enablerInTouchWith' && filter.value === '__UNASSIGNED__') {
             if (filter.operator === 'is') return !personValue;
             if (filter.operator === 'is_not') return !!personValue;
          }

          if (filter.operator === 'is_empty') {
            return personValue === null || personValue === undefined || personValue === '';
          }
          if (filter.operator === 'is_not_empty') {
            return personValue !== null && personValue !== undefined && personValue !== '';
          }
          
          if (personValue === null || personValue === undefined) return false;

          const filterValue = filter.value;
          
          if (typeof filter.value === 'undefined' || filter.value === null || filter.value === '') return true;

          const personString = String(personValue).toLowerCase();
          const filterString = String(filterValue).toLowerCase();

          switch (filter.operator) {
            case 'contains':
              return personString.includes(filterString);
            case 'not_contains':
              return !personString.includes(filterString);
            case 'is': {
              if (typeof personValue === 'boolean') {
                return personValue === (filterValue === 'true' || filterValue === true);
              }
              return personString === filterString;
            }
            case 'is_not': {
              if (typeof personValue === 'boolean') {
                return personValue !== (filterValue === 'true' || filterValue === true);
              }
              return personString !== filterString;
            }
            case 'eq':
              return Number(personValue) === Number(filterValue);
            case 'neq':
              return Number(personValue) !== Number(filterValue);
            case 'gt':
              return Number(personValue) > Number(filterValue);
            case 'lt':
              return Number(personValue) < Number(filterValue);
            case 'gte':
              return Number(personValue) >= Number(filterValue);
            case 'lte':
              return Number(personValue) <= Number(filterValue);
            default:
              return true;
          }
        });
      });
    }

    // Apply column filters
    tempPeople = applyColumnFilters(tempPeople, columnFilters);

    // Apply sorting
    return tempPeople.sort((a, b) => {
      for (const { field, direction } of sortDescriptors) {
        const valA = a[field as keyof Person];
        const valB = b[field as keyof Person];

        let comparison = 0;

        if (valA == null && valB != null) {
          comparison = 1;
        } else if (valA != null && valB == null) {
          comparison = -1;
        } else if (valA == null && valB == null) {
          comparison = 0;
        } else if (field === 'createdAt' || field === 'lastCallAt') {
            const dateA = (valA as any)?.toDate ? (valA as any).toDate() : new Date(0);
            const dateB = (valB as any)?.toDate ? (valB as any).toDate() : new Date(0);
            comparison = dateA.getTime() - dateB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, undefined, { numeric: true });
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }

        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [people, searchTerm, filters, sortDescriptors, groups, selectedGroupId, columnFilters]);

  React.useEffect(() => {
    if (!isEventDialogOpen || !isStartingSessionFlow || filteredPeople.length === 0) {
      setCallRangeNames({ from: '', to: '' });
      return;
    }

    const handler = setTimeout(() => {
        const fromInput = callRange.from.trim();
        const toInput = callRange.to.trim();

        const fromIndex = parseInt(fromInput, 10) - 1;
        const toIndex = toInput === '' ? filteredPeople.length - 1 : parseInt(toInput, 10) - 1;

        let fromName = '';
        if (fromInput && !isNaN(fromIndex) && fromIndex >= 0 && fromIndex < filteredPeople.length) {
          fromName = filteredPeople[fromIndex]?.fullName || '';
        }

        let toName = '';
        if (!isNaN(toIndex) && toIndex >= 0 && toIndex < filteredPeople.length) {
          toName = filteredPeople[toIndex]?.fullName || '';
        }

        setCallRangeNames({ from: fromName, to: toName });
    }, 300); // Debounce for 300ms

    return () => {
        clearTimeout(handler);
    };
  }, [callRange, filteredPeople, isEventDialogOpen, isStartingSessionFlow]);

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
  };
  
  const handleSessionSave = (
    personId: string, 
    remark: string, 
    status: CallStatus, 
    sg: boolean | undefined, 
    ma: boolean | undefined, 
    frp: boolean | undefined
  ) => {
    if (!appUser || !user) return;
    
    const callTime = new Date(); // Use a client-side timestamp for the history entry
    const currentEvent = currentCallingEvent;
    
    const callHistoryEntry: any = {
      remark: remark,
      calledAt: callTime,
      status: status,
      event: currentEvent,
      callerId: appUser.id,
      callerName: appUser.name,
      callerPhotoUrl: user.photoURL || '',
    };
    if (sg !== undefined) callHistoryEntry.sg = sg;
    if (ma !== undefined) callHistoryEntry.ma = ma;
    if (frp !== undefined) callHistoryEntry.frp = frp;

    const updateData: any = {
      lastCallRemark: remark,
      lastCallAt: serverTimestamp(),
      lastCallStatus: status,
      callHistory: arrayUnion(callHistoryEntry),
    };
    if (sg !== undefined) updateData.lastSg = sg;
    if (ma !== undefined) updateData.lastMa = ma;
    if (frp !== undefined) updateData.lastFrp = frp;

    updatePerson(personId, updateData);
    
    // Optimistic update using the same client-side timestamp
    setPeople(prev => prev.map(p => {
        if (p.id === personId) {
            const newHistory = p.callHistory ? [...p.callHistory, callHistoryEntry] : [callHistoryEntry];
            const updatedPerson = {
                ...p,
                callHistory: newHistory,
                lastCallRemark: remark,
                lastCallAt: callTime, // Show the client time in UI immediately
                lastCallStatus: status,
            };
            if (sg !== undefined) updatedPerson.lastSg = sg;
            if (ma !== undefined) updatedPerson.lastMa = ma;
            if (frp !== undefined) updatedPerson.lastFrp = frp;
            return updatedPerson;
        }
        return p;
    }));
  };
  
  const handleDeletePerson = () => {
    // This view is for calling, not deleting. Deleting can be done from main contacts page.
    toast({
        title: "Action Disabled",
        description: "Please go to the main Contacts page to delete a contact.",
    });
  };

  const handleOpenEventDialog = (isStartingFlow: boolean) => {
    setEditableEventName(currentCallingEvent);
    setCallRange({ from: '1', to: String(filteredPeople.length) });
    setIsStartingSessionFlow(isStartingFlow);
    setIsEventDialogOpen(true);
  };

  const handleSaveEventAndContinue = async () => {
    if (!appUser) return;
    if (!editableEventName.trim()) {
      toast({ variant: 'destructive', title: 'Event name cannot be empty.' });
      return;
    }

    if (editableEventName !== currentCallingEvent) {
      try {
        await updateUser(appUser.id, { currentCallingEvent: editableEventName });
        setCurrentCallingEvent(editableEventName);
        updateCurrentAppUser({ currentCallingEvent: editableEventName });
        toast({ title: 'Calling Event Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error updating event.' });
        return; 
      }
    }

    if (isStartingSessionFlow) {
      const fromIndex = parseInt(callRange.from, 10);
      const toIndex = callRange.to.trim() === '' ? filteredPeople.length : parseInt(callRange.to, 10);

      if (
        isNaN(fromIndex) ||
        isNaN(toIndex) ||
        fromIndex < 1 ||
        toIndex > filteredPeople.length ||
        fromIndex > toIndex
      ) {
        toast({
          variant: 'destructive',
          title: 'Invalid Range',
          description: `Please enter a valid range between 1 and ${filteredPeople.length}.`,
        });
        return;
      }
      
      const peopleToCall = filteredPeople.slice(fromIndex - 1, toIndex);

      if (peopleToCall.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Contacts Selected',
          description: 'The specified range is empty.',
        });
        return;
      }
      
      setSessionStartIndex(fromIndex - 1);
      setPeopleForSession(peopleToCall);
      setIsSessionDialogOpen(true);
    }
    
    setIsEventDialogOpen(false);
  };
  
  const handleAddToGroup = async (targetGroupId: string) => {
    if (selectedIds.size === 0 || !appUser) return;
    try {
        await addPeopleToGroup(targetGroupId, Array.from(selectedIds));
        toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
        const updatedGroups = await getGroups(appUser);
        setGroups(updatedGroups);
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.' });
    }
  };

  const handleSaveGroupAndAddMembers = async (groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">) => {
    if (!appUser) return;
    try {
        const newGroupData: Omit<Group, 'id' | 'createdBy'> = {
            memberCount: 0,
            peopleIds: [],
            ...groupData,
        };
        const newGroup = await createGroup(newGroupData, appUser);
        setGroups((prev) => [...prev, newGroup]);
        
        if (selectedIds.size > 0) {
            await addPeopleToGroup(newGroup.id, Array.from(selectedIds));
            toast({
                title: "Group Created & Members Added",
                description: `The group "${newGroup.name}" was created and ${selectedIds.size} contacts were added.`,
            });
            const updatedGroups = await getGroups(appUser);
            setGroups(updatedGroups);
            setSelectedIds(new Set());
        } else {
            toast({
                title: "Group Created",
                description: `The new group "${newGroup.name}" has been added.`,
            });
        }
        setIsCreateGroupDialogOpen(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create or add members to the new group.",
        });
    }
  };

  const handleAssignHelper = async (helper: AppUser | null) => {
    if (selectedIds.size === 0) return;
    try {
        await assignHelperToPeople(Array.from(selectedIds), helper);
        toast({
            title: helper ? 'Helper Assigned' : 'Helper Unassigned',
            description: `${selectedIds.size} contacts have been updated.`,
        });
        // Refetch all people data to show the change
        if (appUser) {
            const peopleData = await getPeople(appUser);
            setPeople(peopleData);
        }
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not assign helper." });
    }
  };


  const renderContent = () => {
    if (isLoading) {
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
                    {isSelectionActive ? (
                        <>
                            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Add to Group</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {groups.map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                                    {groups.length > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuItem onSelect={() => setIsCreateGroupDialogOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create New Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {canAssignHelper && <Button variant="outline" size="sm" onClick={() => setIsAssignHelperDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" />Assign Helper</Button>}
                        </>
                    ) : (
                        <>
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
                            
                        </>
                    )}
                </div>
                 <Button size="sm" onClick={() => handleOpenEventDialog(true)} disabled={filteredPeople.length === 0 || isSelectionActive}>
                    <Headset className="mr-2 h-4 w-4" />
                    Start Calling Session ({filteredPeople.length})
                </Button>
            </div>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No contacts found.</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <PersonTable
            people={filteredPeople}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
            isCallingAssistantView={true}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            isSelectionActive={isSelectionActive}
            sortDescriptors={sortDescriptors}
            setSortDescriptors={setSortDescriptors}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />
        )}
      </>
    );
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <PageHeader
              title="Calling Assistant"
              description={
                <span className="flex items-center gap-1">
                  A focused view to call contacts for:
                  <strong className="text-foreground ml-1">{currentCallingEvent}</strong>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEventDialog(false)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </span>
              }
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
              {renderContent()}
            </main>
        </div>
        
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
                        max={filteredPeople.length}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                        type="number"
                        placeholder="To"
                        value={callRange.to}
                        onChange={(e) => setCallRange(prev => ({...prev, to: e.target.value}))}
                        min="1"
                        max={filteredPeople.length}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Select a range from your filtered list of {filteredPeople.length} contacts.
                  </p>
                  {callRangeNames.from && (
                    <div className="text-xs text-muted-foreground mt-2 border-l-2 border-primary pl-2 space-y-1">
                        <p>From: <strong className="text-foreground">{callRange.from}. {callRangeNames.from}</strong></p>
                        {callRangeNames.to && <p>To: <strong className="text-foreground">{callRange.to || filteredPeople.length}. {callRangeNames.to}</strong></p>}
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
          groups={groups}
          sessionStartIndex={sessionStartIndex}
          totalPeopleCount={filteredPeople.length}
        />
        
        <CreateUpdateGroupDialog
            isOpen={isCreateGroupDialogOpen}
            setIsOpen={setIsCreateGroupDialogOpen}
            onSave={handleSaveGroupAndAddMembers}
        />
        
        <AssignHelperDialog
          isOpen={isAssignHelperDialogOpen}
          setIsOpen={setIsAssignHelperDialogOpen}
          onSave={handleAssignHelper}
          peopleCount={selectedIds.size}
        />

        {editingPerson && (
           <CreateUpdatePersonDialog
              isOpen={!!editingPerson}
              setIsOpen={() => setEditingPerson(undefined)}
              onSave={() => {}} // Note: The main save logic is not used here, dialog is for viewing/quick edits
              person={editingPerson}
              allPeople={people}
          />
        )}
      </div>
    </AuthGuard>
  );
}

    
