
"use client";

import * as React from "react";
import {
  List,
  PlusCircle,
  Search,
  LayoutGrid,
  Upload,
} from "lucide-react";
import { read, utils, writeFile } from "xlsx";
import { createInitialProgress } from "@/lib/data";
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
import { FirebaseConfigError } from "@/components/firebase-config-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  importPeople,
} from "@/services/people-service";
import { getEnablers, getContactSources } from "@/services/settings-service";

export default function ContactsPage() {
  const { toast } = useToast();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [view, setView] = React.useState<"card" | "table">("card");
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [enablerFilter, setEnablerFilter] = React.useState("");
  const [contactSourceFilter, setContactSourceFilter] = React.useState("");
  const [occupationFilter, setOccupationFilter] = React.useState("");
  const [chantingFilter, setChantingFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState("createdAt_desc");

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(
    undefined
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [enablerOptions, setEnablerOptions] = React.useState<string[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [configError, setConfigError] = React.useState(false);

  React.useEffect(() => {
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
        if (error instanceof Error && (error.message.includes('offline') || error.message.includes('permission-denied'))) {
          setConfigError(true);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load data. Please check your connection or Firebase setup.",
          });
        }
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

      const occupationMatch =
        !occupationFilter ||
        person.occupation.toLowerCase().includes(occupationFilter.toLowerCase());
      
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
        const dateA = a.createdAt
          ? a.createdAt.toDate
            ? a.createdAt.toDate()
            : a.createdAt
          : new Date(0);
        const dateB = b.createdAt
          ? b.createdAt.toDate
            ? b.createdAt.toDate()
            : b.createdAt
          : new Date(0);
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

  const handleSampleDownload = () => {
    const headers = [
      "firstName", "lastName", "phone", "age", "stayingWith",
      "occupation", "rentDetails", "nativePlace", "sgRating",
      "contactSource", "chantingStatus", "fromOtherCamp", "enablerInTouchWith"
    ];
    const dummyContact = [{
      firstName: "John",
      lastName: "Doe",
      phone: "9876543210",
      age: 25,
      stayingWith: "PG / Hostel",
      occupation: "Software Engineer",
      rentDetails: "7000/month",
      nativePlace: "Mumbai",
      sgRating: "A",
      contactSource: "Govinda Temple",
      chantingStatus: "4 rounds",
      fromOtherCamp: false,
      enablerInTouchWith: "Sarthak",
    }];

    const worksheet = utils.json_to_sheet(dummyContact, { header: headers });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    writeFile(workbook, "contacts_sample.xlsx");
  };

  const handleExport = () => {
    if (filteredPeople.length === 0) {
      toast({
        variant: "destructive",
        title: "No Contacts to Export",
        description: "There are no contacts in the current view to export.",
      });
      return;
    }

    const exportData = filteredPeople.map(p => ({
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        age: p.age,
        stayingWith: p.stayingWith,
        occupation: p.occupation,
        rentDetails: p.rentDetails,
        nativePlace: p.nativePlace,
        sgRating: p.sgRating,
        contactSource: p.contactSource,
        chantingStatus: p.chantingStatus,
        fromOtherCamp: p.fromOtherCamp,
        enablerInTouchWith: p.enablerInTouchWith,
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    writeFile(workbook, "contacts_export.xlsx");

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredPeople.length} contacts.`
    });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        const newPeople: Omit<Person, 'id' | 'createdAt'>[] = json
          .map((row: any) => {
            if (!row.firstName || !row.lastName || !row.phone) {
              console.warn("Skipping row due to missing data: firstName, lastName, and phone are required.", row);
              return null;
            }

            const age = parseInt(String(row.age), 10);
            const isValidAge = !isNaN(age) && age >= 16 && age <= 40;
            const stayingWith = ["PG / Hostel", "Flat", "Family"].includes(row.stayingWith) ? row.stayingWith : "Family";

            return {
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
              customData: {},
            };
          })
          .filter((p): p is Omit<Person, 'id' | 'createdAt'> => p !== null);

        if (newPeople.length === 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: "No valid contacts found. Ensure columns include at least: firstName, lastName, phone.",
          });
          return;
        }

        await importPeople(newPeople);
        const updatedPeople = await getPeople();
        setPeople(updatedPeople);

        toast({
          title: "Import Successful",
          description: `${newPeople.length} new contacts have been added.`,
        });
      } catch (error) {
        console.error("Error importing file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error processing your file. Please check your Firebase setup.",
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

  const handleDeletePerson = async (personId: string) => {
    try {
      await deletePerson(personId);
      setPeople((prev) => prev.filter((p) => p.id !== personId));
      toast({
        title: "Person Deleted",
        description: "The person has been removed from your contacts.",
      });
    } catch(error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete person.",
      });
    }
  };

  const handleSavePerson = async (personData: Omit<Person, "id" | "progress" | "createdAt">) => {
    try {
      if (editingPerson) {
        const updatedData = { ...editingPerson, ...personData };
        await updatePerson(editingPerson.id, personData);
        setPeople((prev) =>
          prev.map((p) =>
            p.id === editingPerson.id ? updatedData : p
          )
        );
        toast({
          title: "Person Updated",
          description: "The person's details have been saved.",
        });
      } else {
        const newPersonData = {
          ...personData,
          progress: createInitialProgress(),
        };
        const newPerson = await createPerson(newPersonData as Omit<Person, 'id' | 'createdAt'>);
        setPeople((prev) => [newPerson, ...prev]);
        toast({
          title: "Person Added",
          description: "The new person has been added to your contacts.",
        });
      }
    } catch(error) {
      console.error("Failed to save person:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save person.",
      });
    }
  };
  
  if (configError) {
    return <FirebaseConfigError />;
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-12">Loading contacts...</div>;
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
            <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt_desc">Recently Added</SelectItem>
                    <SelectItem value="name_asc">Alphabetical (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Alphabetical (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
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

        {filteredPeople.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No contacts found.</p>
            <p className="text-sm">Try adjusting your filters or add a new person.</p>
          </div>
        )}

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
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Contacts"
            description={`Manage data for ${filteredPeople.length} people.`}
          >
            <div className="flex items-center gap-2">
              <AdminModeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3">
                      <Upload className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Import/Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      Import from Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport}>
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSampleDownload}>
                      Download Sample Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" onClick={handleAddPerson} className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3">
                  <PlusCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Person</span>
                </Button>
            </div>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {renderContent()}
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
