"use client";

import * as React from "react";
import {
  FileDown,
  Filter,
  List,
  PlusCircle,
  Search,
  Table,
  LayoutGrid,
} from "lucide-react";
import { mockPeople } from "@/lib/data";
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

export default function PeoplePage() {
  const { toast } = useToast();
  const [people, setPeople] = React.useState<Person[]>(mockPeople);
  const [view, setView] = React.useState<"card" | "table">("card");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filteredPeople = React.useMemo(() => {
    return people.filter((person) => {
      const name = `${person.firstName} ${person.lastName}`.toLowerCase();
      const search = searchTerm.toLowerCase();
      const statusMatch =
        statusFilter === "all" || person.status === statusFilter;
      const searchMatch =
        name.includes(search) || person.email.toLowerCase().includes(search);
      return statusMatch && searchMatch;
    });
  }, [people, searchTerm, statusFilter]);

  const handleExport = (format: "PDF" | "Excel") => {
    toast({
      title: "Exporting Data",
      description: `Your data will be exported as a ${format} file. This feature is coming soon!`,
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col bg-background">
        <PageHeader
          title="People"
          description={`Manage data for ${filteredPeople.length} people.`}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("Excel")}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Excel Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("PDF")}
            >
              <FileDown className="mr-2 h-4 w-4" />
              PDF Export
            </Button>
            <Button size="sm">
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
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <PersonTable people={filteredPeople} />
          )}
        </main>
      </div>
    </div>
  );
}
