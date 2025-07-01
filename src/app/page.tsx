
"use client";

import * as React from "react";
import {
  List,
  PlusCircle,
  Search,
  LayoutGrid,
  Upload,
} from "lucide-react";
import { read, utils } from "xlsx";
import { mockPeople, createInitialProgress } from "@/lib/data";
import type { Person } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { AdminModeToggle } from "@/components/admin-mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const migratePersonData = (person: any): Person => {
  // If a new field exists, assume it's already migrated
  if (person.enablerInTouchWith !== undefined) {
    return person as Person;
  }
  // Otherwise, it's an old record, migrate it to the new structure
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: person.phone || '',
    photoUrl: person.photoUrl || 'https://placehold.co/100x100.png',
    age: 25, // default age
    stayingWith: 'Family', // default
    occupation: '',
    rentDetails: '',
    nativePlace: person.location || '', // migrate old location
    sgRating: person.status || 'N/A', // migrate old status
    contactSource: '',
    chantingStatus: 'N/A',
    fromOtherCamp: false,
    enablerInTouchWith: '',
    progress: (person.progress && Array.isArray(person.progress) && person.progress[0]?.answers) ? person.progress : createInitialProgress(),
  };
};


export default function ContactsPage() {
  const { toast } = useToast();
  const [people, setPeople] = React.useState<Person[]>([]);
  const [view, setView] = React.useState<"card" | "table">("card");
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [enablerFilter, setEnablerFilter] = React.useState("");
  const [contactSourceFilter, setContactSourceFilter] = React.useState("");
  const [occupationFilter, setOccupationFilter] = React.useState("");
  const [chantingFilter, setChantingFilter] = React.useState("");

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(
    undefined
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [enablerOptions, setEnablerOptions] = React.useState<string[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    try {
      const storedEnablers = localStorage.getItem('enablers');
      if (storedEnablers) {
        setEnablerOptions(JSON.parse(storedEnablers));
      }
      const storedContactSources = localStorage.getItem('contactSources');
      if (storedContactSources) {
        setContactSourceOptions(JSON.parse(storedContactSources));
      }
    } catch (error) {
      console.error("Failed to load filter options from localStorage", error);
    }
  }, []);

  React.useEffect(() => {
    try {
      const storedPeople = localStorage.getItem("people");
      if (storedPeople) {
        const parsedPeople = JSON.parse(storedPeople);
        const migratedPeople = parsedPeople.map(migratePersonData);
        setPeople(migratedPeople);
      } else {
        setPeople(mockPeople);
      }
    } catch (error) {
      console.error("Failed to parse people from localStorage", error);
      setPeople(mockPeople);
    }
  }, []);

  React.useEffect(() => {
    if (people.length > 0) {
      localStorage.setItem("people", JSON.stringify(people));
    }
  }, [people]);

  const filteredPeople = React.useMemo(() => {
    return people.filter((person) => {
      const search = searchTerm.toLowerCase();
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      const phone = person.phone.toLowerCase();
      const nativePlace = person.nativePlace.toLowerCase();

      const generalSearchMatch =
        !search || name.includes(search) || phone.includes(search) || nativePlace.includes(search);

      const enablerMatch = !enablerFilter || person.enablerInTouchWith === enablerFilter;
      
      const sourceMatch = !contactSourceFilter || person.contactSource === contactSourceFilter;

      const occupationMatch =
        !occupationFilter ||
        person.occupation.toLowerCase().includes(occupationFilter.toLowerCase());
      
      const chantingMatch =
        !chantingFilter ||
        person.chantingStatus.toLowerCase().includes(chantingFilter.toLowerCase());

      return generalSearchMatch && enablerMatch && sourceMatch && occupationMatch && chantingMatch;
    });
  }, [people, searchTerm, enablerFilter, contactSourceFilter, occupationFilter, chantingFilter]);
  
  const clearFilters = () => {
    setSearchTerm("");
    setEnablerFilter("");
    setContactSourceFilter("");
    setOccupationFilter("");
    setChantingFilter("");
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        const newPeople: Person[] = json
          .map((row: any) => {
            if (!row.firstName || !row.lastName || !row.phone) {
              console.warn("Skipping row due to missing data: firstName, lastName, and phone are required.", row);
              return null;
            }

            const age = parseInt(String(row.age), 10);
            const isValidAge = !isNaN(age) && age >= 16 && age <= 40;
            const stayingWith = ["PG / Hostel", "Flat", "Family"].includes(row.stayingWith) ? row.stayingWith : "Family";

            return {
              id: `person-${Date.now()}-${Math.random()}`,
              firstName: String(row.firstName),
              lastName: String(row.lastName),
              phone: String(row.phone),
              age: isValidAge ? age : 25,
              stayingWith: stayingWith,
              occupation: String(row.occupation || ""),
              rentDetails: String(row.rentDetails || ""),
              nativePlace: String(row.nativePlace || ""),
              sgRating: String(row.sgRating || ""),
              contactSource: String(row.contactSource || ""),
              chantingStatus: String(row.chantingStatus || ""),
              fromOtherCamp: String(row.fromOtherCamp).toLowerCase() === 'yes' || String(row.fromOtherCamp) === 'true',
              enablerInTouchWith: '',
              photoUrl: `https://placehold.co/100x100.png`,
              progress: createInitialProgress(),
            };
          })
          .filter((p): p is Person => p !== null);

        if (newPeople.length === 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: "No valid contacts found. Ensure columns include at least: firstName, lastName, phone.",
          });
          return;
        }

        setPeople((prev) => [...prev, ...newPeople]);
        toast({
          title: "Import Successful",
          description: `${newPeople.length} new contacts have been added.`,
        });
      } catch (error) {
        console.error("Error importing file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing your file. Please ensure it's a valid Excel or CSV file.",
        });
      } finally {
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddPerson = () => {
    setEditingPerson(undefined);
    setIsDialogOpen(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };

  const handleDeletePerson = (personId: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    toast({
      title: "Person Deleted",
      description: "The person has been removed from your contacts.",
    });
  };

  const handleSavePerson = (personData: Omit<Person, "id" | "progress">) => {
    if (editingPerson) {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === editingPerson.id ? { ...editingPerson, ...personData } : p
        )
      );
      toast({
        title: "Person Updated",
        description: "The person's details have been saved.",
      });
    } else {
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        ...personData,
        progress: createInitialProgress(),
      };
      setPeople((prev) => [newPerson, ...prev]);
      toast({
        title: "Person Added",
        description: "The new person has been added to your contacts.",
      });
    }
  };

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Contacts"
            description={`Manage data for ${filteredPeople.length} people.`}
          >
            <div className="flex items-center gap-4">
              <AdminModeToggle />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import from Excel
                </Button>
                <Button size="sm" onClick={handleAddPerson}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Person
                </Button>
              </div>
            </div>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md bg-muted p-1">
                    <Button
                        variant={view === "card" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setView("card")}
                        aria-label="Card View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={view === "table" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setView("table")}
                        aria-label="Table View"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    </div>
                </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Select value={enablerFilter} onValueChange={(value) => setEnablerFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Enabler" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Enablers</SelectItem>
                            {enablerOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={contactSourceFilter} onValueChange={(value) => setContactSourceFilter(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            {contactSourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input 
                        placeholder="Filter by Occupation"
                        value={occupationFilter}
                        onChange={(e) => setOccupationFilter(e.target.value)}
                    />
                    <Input 
                        placeholder="Filter by Chanting Status"
                        value={chantingFilter}
                        onChange={(e) => setChantingFilter(e.target.value)}
                    />
                    <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                </div>
            </div>

            {view === "card" ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPeople.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                  />
                ))}
              </div>
            ) : (
              <PersonTable
                people={filteredPeople}
                onEdit={handleEditPerson}
                onDelete={handleDeletePerson}
              />
            )}
          </main>
        </div>
      </div>
      <CreateUpdatePersonDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSave={handleSavePerson}
        person={editingPerson}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
    </>
  );
}
