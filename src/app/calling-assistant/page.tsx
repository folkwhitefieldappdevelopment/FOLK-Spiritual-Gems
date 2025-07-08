
"use client";

import * as React from "react";
import { Headset, Loader2, Edit } from "lucide-react";
import type { Person, CallStatus } from "@/lib/types";
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
import { getPeople, updatePerson } from "@/services/people-service";
import { getEnablers, getContactSources, getCurrentCallingEvent, updateCurrentCallingEvent, type EnablerOption } from "@/services/settings-service";
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

export default function CallingAssistantPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([{ field: 'createdAt', direction: 'desc' }]);

  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [currentCallingEvent, setCurrentCallingEvent] = React.useState("Loading event...");

  // State for the event editing dialog
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false);
  const [isStartingSessionFlow, setIsStartingSessionFlow] = React.useState(false);
  const [editableEventName, setEditableEventName] = React.useState("");

  React.useEffect(() => {
    if (!appUser) {
        setIsLoading(true);
        return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [peopleData, enablersData, sourcesData, eventData] = await Promise.all([
          getPeople(appUser),
          getEnablers(appUser, 'filter'),
          getContactSources(),
          getCurrentCallingEvent(),
        ]);
        setPeople(peopleData);
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
        setCurrentCallingEvent(eventData);
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
    };
    fetchData();
  }, [appUser]);

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
    ]
  }, [enablerOptions, contactSourceOptions]);


  const filteredPeople = React.useMemo(() => {
    let tempPeople = [...people];

    // Apply filters
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
  }, [people, filters, sortDescriptors]);

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
  };
  
  const handleSessionSave = (personId: string, remark: string, status: CallStatus, sg: boolean | undefined, ma: boolean | undefined, frp: boolean | undefined) => {
    const callTime = new Date(); // Use a client-side timestamp for the history entry
    const currentEvent = currentCallingEvent;
    
    const callHistoryEntry: any = {
      remark: remark,
      calledAt: callTime,
      status: status,
      event: currentEvent,
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
    setIsStartingSessionFlow(isStartingFlow);
    setIsEventDialogOpen(true);
  };

  const handleSaveEventAndContinue = async () => {
    if (!editableEventName.trim()) {
      toast({ variant: 'destructive', title: 'Event name cannot be empty.' });
      return;
    }

    if (editableEventName !== currentCallingEvent) {
      try {
        await updateCurrentCallingEvent(editableEventName);
        setCurrentCallingEvent(editableEventName);
        toast({ title: 'Calling Event Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error updating event.' });
        return; 
      }
    }

    setIsEventDialogOpen(false);

    if (isStartingSessionFlow) {
      setIsSessionDialogOpen(true);
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
                <div className="flex items-center gap-2">
                    <FilterPopover 
                        filters={filters}
                        setFilters={setFilters}
                        filterableFields={filterableFields}
                    />
                    <SortPopover
                        sortDescriptors={sortDescriptors}
                        setSortDescriptors={setSortDescriptors}
                    />
                </div>
                 <Button size="sm" onClick={() => handleOpenEventDialog(true)} disabled={filteredPeople.length === 0}>
                    <Headset className="mr-2 h-4 w-4" />
                    Start Calling Session ({filteredPeople.length})
                </Button>
            </div>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No contacts found.</p>
            <p className="text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <PersonTable
            people={filteredPeople}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
            isCallingAssistantView={true}
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
                  ? 'Confirm or update the event name before you start your calling session.'
                  : 'Update the name of the current calling event.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={editableEventName}
                onChange={(e) => setEditableEventName(e.target.value)}
                className="mt-1"
                placeholder="e.g., Spiritual Camp - July 2024"
              />
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
          people={filteredPeople}
          onSaveRemark={handleSessionSave}
          currentEvent={currentCallingEvent}
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
