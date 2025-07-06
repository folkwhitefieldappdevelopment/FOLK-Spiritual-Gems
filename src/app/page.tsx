
"use client";

import * as React from "react";
import {
  List,
  PlusCircle,
  Search,
  LayoutGrid,
  Upload,
  Briefcase,
  Sunrise,
  Loader2,
} from "lucide-react";
import { read, utils, write } from "xlsx";
import JSZip from "jszip";
import { createInitialProgress } from "@/lib/data";
import type { Person } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
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
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";

export default function ContactsPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
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

  React.useEffect(() => {
    if (!appUser) {
        setIsLoading(true);
        return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [peopleData, enablersData, sourcesData] = await Promise.all([
          getPeople(appUser),
          getEnablers(appUser),
          getContactSources(),
        ]);
        setPeople(peopleData);
        setEnablerOptions(enablersData);
        setContactSourceOptions(sourcesData);
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
      "firstName", "lastName", "phone", "photoUrl", "age", "stayingWith",
      "occupation", "organisation", "rentDetails", "nativePlace", "sgRating",
      "contactSource", "chantingStatus", "fromOtherCamp", "enablerInTouchWith"
    ];
    const dummyContact = [{
      firstName: "John",
      lastName: "Doe",
      phone: "9876543210",
      photoUrl: "https://placehold.co/100x100.png",
      age: 25,
      stayingWith: "PG / Hostel",
      occupation: "Working",
      organisation: "Acme Inc.",
      rentDetails: "7000/month",
      nativePlace: "Mumbai",
      sgRating: 8,
      contactSource: "Govinda Temple",
      chantingStatus: "4 rounds",
      fromOtherCamp: false,
      enablerInTouchWith: "Sarthak",
    }];

    const worksheet = utils.json_to_sheet(dummyContact, { header: headers });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "contacts_sample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async () => {
    if (filteredPeople.length === 0) {
      toast({
        variant: "destructive",
        title: "No Contacts to Export",
        description: "There are no contacts in the current view to export.",
      });
      return;
    }

    setIsExporting(true);

    const zip = new JSZip();
    const photosFolder = zip.folder("photos");
    const exportData = [];

    for (const p of filteredPeople) {
      let photoColumnValue = '';
      if (p.photoUrl) {
        if (p.photoUrl.startsWith('data:image')) {
          try {
            const extension = p.photoUrl.split(';')[0].split('/')[1] || 'png';
            const fileName = `${p.firstName}_${p.lastName}_${p.id}.${extension}`;
            photoColumnValue = `photos/${fileName}`;

            const response = await fetch(p.photoUrl);
            const blob = await response.blob();
            
            if (photosFolder) {
              photosFolder.file(fileName, blob);
            }

          } catch (e) {
            console.error(`Failed to process image for ${p.firstName}:`, e);
            photoColumnValue = 'Error processing image';
          }
        } else {
          photoColumnValue = p.photoUrl;
        }
      }
      
      exportData.push({
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        photoUrl: photoColumnValue,
        age: p.age,
        stayingWith: p.stayingWith,
        occupation: p.occupation,
        organisation: p.organisation,
        rentDetails: p.rentDetails,
        nativePlace: p.nativePlace,
        sgRating: p.sgRating || 0,
        contactSource: p.contactSource,
        chantingStatus: p.chantingStatus,
        fromOtherCamp: p.fromOtherCamp,
        enablerInTouchWith: p.enablerInTouchWith,
      });
    }

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
    zip.file("contacts.xlsx", excelBuffer);

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "contacts_export.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredPeople.length} contacts in contacts_export.zip.`,
      });

    } catch (err) {
      console.error("Failed to generate zip file:", err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not create the zip file.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !appUser) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        const totalRows = json.length;
        const existingPhones = new Set(people.map(p => p.phone));
        const phonesInThisFile = new Set<string>();

        const newPeople: Omit<Person, 'id' | 'createdAt'>[] = json
          .map((row: any) => {
            if (!row.firstName || !row.lastName || !row.phone) {
              console.warn("Skipping row due to missing data: firstName, lastName, and phone are required.", row);
              return null;
            }

            const age = parseInt(String(row.age), 10);
            const isValidAge = !isNaN(age) && age >= 16 && age <= 40;
            const stayingWith = ["PG / Hostel", "Flat", "Family"].includes(row.stayingWith) ? row.stayingWith : "Family";
            const rating = parseInt(String(row.sgRating), 10);
            const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10;
            const phone = String(row.phone).replace(/\s+/g, '');
            const occupation = occupationStatuses.includes(row.occupation) ? row.occupation : "Working";
            const photoUrlValue = String(row.photoUrl || '').trim();
            const isValidPhotoUrl = photoUrlValue.startsWith('http') || photoUrlValue.startsWith('data:image');
            const enablerValue = String(row.enablerInTouchWith || '').trim();

            return {
              firstName: String(row.firstName),
              lastName: String(row.lastName),
              phone,
              age: isValidAge ? age : 25,
              stayingWith: stayingWith,
              occupation: occupation,
              organisation: String(row.organisation || ""),
              rentDetails: String(row.rentDetails || ""),
              nativePlace: String(row.nativePlace || ""),
              sgRating: isValidRating ? rating : 0,
              contactSource: String(row.contactSource || ""),
              chantingStatus: String(row.chantingStatus || ""),
              fromOtherCamp: String(row.fromOtherCamp).toLowerCase() === 'yes' || String(row.fromOtherCamp) === 'true',
              enablerInTouchWith: enablerValue,
              photoUrl: isValidPhotoUrl ? photoUrlValue : `https://placehold.co/100x100.png`,
              progress: createInitialProgress(),
              customData: {},
            };
          })
          .filter((p): p is Omit<Person, 'id' | 'createdAt'> => {
             if (p === null) return false;
    
            // Check for duplicates
            if (existingPhones.has(p.phone) || phonesInThisFile.has(p.phone)) {
                console.warn(`Skipping duplicate phone number during import: ${p.phone}`);
                return false;
            }
            phonesInThisFile.add(p.phone);
            return true;
          });
        
        const importedCount = newPeople.length;
        const skippedCount = totalRows - importedCount;

        if (importedCount === 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: skippedCount > 0 ? "All contacts in the file were duplicates or invalid." : "No valid contacts found. Ensure columns include at least: firstName, lastName, phone.",
          });
          return;
        }

        await importPeople(newPeople, appUser);
        const updatedPeople = await getPeople(appUser);
        setPeople(updatedPeople);

        toast({
          title: "Import Successful",
          description: `${importedCount} new contacts added. ${skippedCount > 0 ? `${skippedCount} duplicates skipped.` : ''}`,
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
        setIsImporting(false);
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
    if (!appUser) return;
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
        const newPerson = await createPerson(newPersonData as Omit<Person, 'id' | 'createdAt'>, appUser);
        setPeople((prev) => [newPerson, ...prev]);
        toast({
          title: "Person Added",
          description: "The new person has been added to your contacts.",
        });
      }
    } catch(error) {
      console.error("Failed to save person:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not save person.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };
  
  const isLoadingAction = isImporting || isExporting;
  const loadingText = isImporting ? 'Importing...' : isExporting ? 'Exporting...' : '';

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
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <PageHeader
              title="FOLK SPIRITUAL GEM"
              description="Your central hub for managing contacts and activities."
            >
              <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3" disabled={isLoadingAction}>
                         {isLoadingAction ? (
                          <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">{isLoadingAction ? loadingText : 'Import/Export'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isLoadingAction}>
                        Import from Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExport} disabled={isLoadingAction}>
                        Export to Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSampleDownload} disabled={isLoadingAction}>
                        Download Sample Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button size="sm" onClick={handleAddPerson} className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3" disabled={isLoadingAction}>
                    <PlusCircle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Person</span>
                  </Button>
              </div>
            </PageHeader>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
              {renderContent()}
            </main>
        </div>
        <CreateUpdatePersonDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSave={handleSavePerson}
          person={editingPerson}
          allPeople={people}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          className="hidden"
          accept=".xlsx, .xls, .csv"
        />
      </div>
    </AuthGuard>
  );
}
