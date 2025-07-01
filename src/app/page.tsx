
"use client";

import * as React from "react";
import {
  Filter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";

export default function ContactsPage() {
  const { toast } = useToast();
  const [people, setPeople] = React.useState<Person[]>([]);
  const [view, setView] = React.useState<"card" | "table">("card");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(
    undefined
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const storedPeople = localStorage.getItem("people");
      if (storedPeople) {
        const parsedPeople: Person[] = JSON.parse(storedPeople);
        const migratedPeople = parsedPeople.map((p) => {
          if (p.progress && Array.isArray(p.progress) && p.progress[0]?.answers) {
            return p;
          }
          return {
            ...p,
            progress: createInitialProgress(),
          };
        });
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
    // A simple check to avoid overwriting on initial empty state
    if (people.length > 0) {
      localStorage.setItem("people", JSON.stringify(people));
    }
  }, [people]);

  const filteredPeople = React.useMemo(() => {
    return people.filter((person) => {
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      const search = searchTerm.toLowerCase();
      const statusMatch =
        statusFilter === "all" || person.status === statusFilter;
      const searchMatch =
        name.includes(search) ||
        (person.email && person.email.toLowerCase().includes(search));
      return statusMatch && searchMatch;
    });
  }, [people, searchTerm, statusFilter]);

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
            if (!row.firstName || !row.lastName || !row.email) {
              console.warn("Skipping row due to missing data:", row);
              return null;
            }

            return {
              id: `person-${Date.now()}-${Math.random()}`,
              firstName: String(row.firstName),
              lastName: String(row.lastName),
              email: String(row.email),
              phone: String(row.phone || ""),
              location: String(row.location || ""),
              status: ["Active", "Inactive", "Pending"].includes(row.status)
                ? row.status
                : "Pending",
              photoUrl: `https://placehold.co/100x100.png`,
              progress: createInitialProgress(),
            };
          })
          .filter((p): p is Person => p !== null);

        if (newPeople.length === 0) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description:
              "No valid contacts found in file. Ensure columns are named: firstName, lastName, email.",
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
          description:
            "There was an error processing your file. Please ensure it's a valid Excel or CSV file.",
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
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
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
