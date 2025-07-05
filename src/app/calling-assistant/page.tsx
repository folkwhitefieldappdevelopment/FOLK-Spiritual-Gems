
"use client";

import * as React from "react";
import { Headset, Search, Sunrise, Loader2 } from "lucide-react";
import type { Person } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { CallingSessionDialog } from "@/components/calling-session-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPeople,
  updatePerson,
} from "@/services/people-service";
import { getEnablers, getContactSources } from "@/services/settings-service";
import { serverTimestamp, arrayUnion } from "firebase/firestore";
import { configError } from "@/lib/firebase";
import { FirebaseConfigError } from "@/components/firebase-config-error";

export default function CallingAssistantPage() {
  const { toast } = useToast();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [enablerFilter, setEnablerFilter] = React.useState("");
  const [contactSourceFilter, setContactSourceFilter] = React.useState("");
  const [occupationFilter, setOccupationFilter] = React.useState("");
  const [chantingFilter, setChantingFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState("createdAt_desc");

  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);

  const [enablerOptions, setEnablerOptions] = React.useState<string[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [firebaseError, setFirebaseError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (configError) {
      setFirebaseError(configError);
      setIsLoading(false);
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [peopleData, enablersData, sourcesData] = await Promise.all([
          getPeople(),
          getEnablers(),
          getContactSources(),
        ]);
        setPeople(peopleData);
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load data. Please check your connection or Firebase setup.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const filteredPeople = React.useMemo(() => {
    const filtered = people.filter((person) => {
      const search = searchTerm.toLowerCase();
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      const phone = person.phone.toLowerCase();
      const nativePlace = person.nativePlace.toLowerCase();

      const generalSearchMatch =
        !search || name.includes(search) || phone.includes(search) || nativePlace.includes(search);

      const enablerMatch = !enablerFilter || person.enablerInTouchWith === enablerFilter;
      const sourceMatch = !contactSourceFilter || person.contactSource === contactSourceFilter;
      const occupationMatch = !occupationFilter || person.occupation === occupationFilter;
      const chantingMatch =
        !chantingFilter ||
        person.chantingStatus.toLowerCase().includes(chantingFilter.toLowerCase());

      return generalSearchMatch && enablerMatch && sourceMatch && occupationMatch && chantingMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name_asc") {
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      }
      if (sortBy === "name_desc") {
        return `${b.firstName} ${b.lastName}`.localeCompare(
          `${a.firstName} ${a.lastName}`
        );
      }
      if (sortBy === "createdAt_desc") {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });
  }, [people, searchTerm, enablerFilter, contactSourceFilter, occupationFilter, chantingFilter, sortBy]);
  
  const clearFilters = () => {
    setSearchTerm("");
    setEnablerFilter("");
    setContactSourceFilter("");
    setOccupationFilter("");
    setChantingFilter("");
    setSortBy("createdAt_desc");
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
  };
  
  const handleSessionSave = (personId: string, remark: string, duration: string) => {
    const callTime = new Date(); // Use a client-side timestamp for the history entry

    updatePerson(personId, {
        lastCallRemark: remark,
        lastCallAt: serverTimestamp(), // This is fine as it's a top-level field
        // @ts-ignore
        callHistory: arrayUnion({
            remark: remark,
            calledAt: callTime, // Use the client-side timestamp here, which is allowed inside arrayUnion
            duration: duration,
        })
    });
    
    // Optimistic update using the same client-side timestamp
    setPeople(prev => prev.map(p => {
        if (p.id === personId) {
            const newHistoryEntry = { remark, calledAt: callTime, duration };
            const newHistory = p.callHistory ? [...p.callHistory, newHistoryEntry] : [newHistoryEntry];
            return {
                ...p,
                callHistory: newHistory,
                lastCallRemark: remark,
                lastCallAt: callTime, // Show the client time in UI immediately
            };
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

  if (firebaseError) {
    return <FirebaseConfigError error={firebaseError} />;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search by name, phone, or native place..."
                    className="pl-10 w-full sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Button size="sm" onClick={() => setIsSessionDialogOpen(true)} disabled={filteredPeople.length === 0}>
                    <Headset className="mr-2 h-4 w-4" />
                    Start Calling Session ({filteredPeople.length})
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Select value={enablerFilter} onValueChange={(value) => setEnablerFilter(value === '__all__' ? '' : value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Enabler" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All Enablers</SelectItem>
                        {enablerOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                </Select>
                  <Select value={contactSourceFilter} onValueChange={(value) => setContactSourceFilter(value === '__all__' ? '' : value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All Sources</SelectItem>
                        {contactSourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={occupationFilter} onValueChange={(value) => setOccupationFilter(value === '__all__' ? '' : value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Occupation" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">All Occupations</SelectItem>
                        {occupationStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="relative">
                  <Sunrise className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Filter by Chanting Status"
                      value={chantingFilter}
                      onChange={(e) => setChantingFilter(e.target.value)}
                      className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
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
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Calling Assistant"
            description="A focused view to call contacts and log remarks."
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
      
      <CallingSessionDialog
        isOpen={isSessionDialogOpen}
        onClose={() => setIsSessionDialogOpen(false)}
        people={filteredPeople}
        onSaveRemark={handleSessionSave}
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
    </>
  );
}
