
"use client";

import * as React from "react";
import {
  List,
  PlusCircle,
  LayoutGrid,
  Upload,
  Trash2,
  Users,
  Loader2,
  UserCheck,
  Search,
} from "lucide-react";
import { read, utils, write } from "xlsx";
import JSZip from "jszip";
import { createInitialProgress } from "@/lib/data";
import type { Person, Group, AppUser } from "@/lib/types";
import { occupationStatuses } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  deletePeople,
  importPeople,
  assignHelperToPeople,
} from "@/services/people-service";
import { getGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { getEnablers, getContactSources, type EnablerOption } from "@/services/settings-service";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { AssignHelperDialog } from "@/components/assign-helper-dialog";
import { SortPopover, type SortDescriptor } from "@/components/sort-popover";
import { FilterPopover, type FilterRule, type FilterableField } from "@/components/filter-popover";
import { Input } from "@/components/ui/input";
import { ColumnFilterState, applyColumnFilters } from "@/components/column-header-filter";

export default function ContactsPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [view, setView] = React.useState<"card" | "table">("card");
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([{ field: 'createdAt', direction: 'desc' }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilterState>({});

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignHelperDialogOpen, setIsAssignHelperDialogOpen] = React.useState(false);

  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(
    undefined
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);

  const canAssignHelper = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const fetchPageData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [peopleData, enablersData, sourcesData, groupsData] = await Promise.all([
        getPeople(appUser),
        getEnablers(appUser, 'filter'),
        getContactSources(),
        getGroups(appUser),
      ]);
      setPeople(peopleData);
      setEnablerOptions(enablersData);
      setContactSourceOptions(sourcesData);
      setGroups(groupsData);
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

  const filterableFields: FilterableField[] = React.useMemo(() => [
    { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
    { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
    { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
    { value: 'chantingStatus', label: 'Chanting Status', type: 'string' },
    { value: 'nativePlace', label: 'Native Place', type: 'string' },
    { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'sgRating', label: 'Rating', type: 'number' },
  ], [enablerOptions, contactSourceOptions]);

  const filteredPeople = React.useMemo(() => {
    let tempPeople = [...people];

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

    // Apply advanced global filters
    if (filters.length > 0) {
      tempPeople = tempPeople.filter(person => {
        return filters.every(filter => {
          const personValue = person[filter.field as keyof Person];

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

    // Apply column filters (only for table view)
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
  }, [people, searchTerm, filters, sortDescriptors, columnFilters]);
  
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, searchTerm, view, columnFilters]);

  const handleSampleDownload = React.useCallback(() => {
    const headers = [
      "fullName", "phone", "photoUrl", "age", "stayingWith",
      "occupation", "organisation", "rentDetails", "nativePlace", "sgRating",
      "contactSource", "chantingStatus", "fromOtherCamp", "enablerInTouchWith"
    ];
    const dummyContact = [{
      fullName: "John Doe",
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
  }, []);

  const handleExport = React.useCallback(async () => {
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
            const name = (p.fullName || 'contact').replace(/\s+/g, '_');
            const fileName = `${name}_${p.id}.${extension}`;
            photoColumnValue = `photos/${fileName}`;

            const response = await fetch(p.photoUrl);
            const blob = await response.blob();
            
            if (photosFolder) {
              photosFolder.file(fileName, blob);
            }

          } catch (e) {
            console.error(`Failed to process image for ${p.fullName}:`, e);
            photoColumnValue = 'Error processing image';
          }
        } else {
          photoColumnValue = p.photoUrl;
        }
      }
      
      exportData.push({
        fullName: p.fullName || '',
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
  }, [filteredPeople, toast]);

  const handleFileImport = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
            const fullName = String(row.fullName || '').trim();
            
            if (!fullName || !row.phone) {
              console.warn("Skipping row due to missing data: fullName and phone are required.", row);
              return null;
            }

            const age = parseInt(String(row.age), 10);
            const isValidAge = !isNaN(age) && age >= 16 && age <= 40;
            const stayingWith = ["PG / Hostel", "Flat", "Family"].includes(row.stayingWith) ? row.stayingWith : "Family";
            const rating = parseInt(String(row.sgRating), 10);
            const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10;
            const phone = String(row.phone).replace(/\s+/g, '');
            const occupation = ["Working", "Student", "Searching for job"].includes(row.occupation) ? row.occupation : "Working";
            const photoUrlValue = String(row.photoUrl || '').trim();
            const isValidPhotoUrl = photoUrlValue.startsWith('http') || photoUrlValue.startsWith('data:image');
            const enablerValue = String(row.enablerInTouchWith || '').trim();

            return {
              fullName,
              phone,
              age: isValidAge ? age : 25,
              stayingWith: stayingWith,
              occupation: occupation as any,
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
            description: skippedCount > 0 ? "All contacts in the file were duplicates or invalid." : "No valid contacts found. Ensure columns include at least: fullName and phone.",
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
  }, [appUser, people, toast]);

  const handleAddPerson = React.useCallback(() => {
    setEditingPerson(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleEditPerson = React.useCallback((person: Person) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  }, []);

  const handleDeletePerson = React.useCallback(async (personId: string) => {
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
  }, [toast]);

  const handleDeleteSelected = React.useCallback(async () => {
    try {
      await deletePeople(Array.from(selectedIds));
      setPeople((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      toast({
        title: "Contacts Deleted",
        description: `${selectedIds.size} contacts have been removed.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the selected contacts.",
      });
    }
  }, [selectedIds, toast]);


  const handleSavePerson = React.useCallback(async (personData: Omit<Person, "id" | "progress" | "createdAt">) => {
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
  }, [appUser, toast, editingPerson]);
  
  const handleSelectionChange = React.useCallback((personId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(personId);
      } else {
        newSet.delete(personId);
      }
      return newSet;
    });
  }, []);

  const handleAddToGroup = React.useCallback(async (groupId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await addPeopleToGroup(groupId, Array.from(selectedIds));
      toast({
        title: "Members Added",
        description: `${selectedIds.size} contacts have been added to the group.`,
      });
      if (!appUser) return;
      const updatedGroups = await getGroups(appUser);
      setGroups(updatedGroups);
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add contacts to the group.",
      });
    }
  }, [selectedIds, toast, appUser]);

  const handleSaveGroupAndAddMembers = React.useCallback(async (groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">) => {
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
  }, [selectedIds, appUser, toast]);
  
  const handleAssignHelper = React.useCallback(async (helper: AppUser | null) => {
    if (selectedIds.size === 0) return;
    try {
      await assignHelperToPeople(Array.from(selectedIds), helper);
      toast({
        title: helper ? 'Helper Assigned' : 'Helper Unassigned',
        description: `${selectedIds.size} contacts have been updated.`,
      });
      // Refetch data to show the change
      await fetchPageData();
      setSelectedIds(new Set());
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not assign helper.",
      });
    }
  }, [selectedIds, toast, fetchPageData]);


  const isLoadingAction = isImporting || isExporting;
  const loadingText = isImporting ? 'Importing...' : isExporting ? 'Exporting...' : '';
  const isSelectionActive = selectedIds.size > 0;

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
                                    <Button variant="outline" size="sm">
                                    <Users className="mr-2 h-4 w-4" />
                                    Add to Group
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {groups.map((group) => (
                                    <DropdownMenuItem
                                        key={group.id}
                                        onSelect={() => handleAddToGroup(group.id)}
                                    >
                                        {group.name}
                                    </DropdownMenuItem>
                                    ))}
                                    {groups.length > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuItem onSelect={() => setIsCreateGroupDialogOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create New Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {canAssignHelper && (
                              <Button variant="outline" size="sm" onClick={() => setIsAssignHelperDialogOpen(true)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Assign Helper
                              </Button>
                            )}

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the selected {selectedIds.size} contacts. This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                            <FilterPopover 
                                filters={filters}
                                setFilters={setFilters}
                                filterableFields={filterableFields}
                            />
                            {view === 'card' && (
                                <SortPopover
                                    sortDescriptors={sortDescriptors}
                                    setSortDescriptors={setSortDescriptors}
                                />
                            )}
                        </>
                    )}
                    {filteredPeople.length > 0 && !isSelectionActive && (
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                              setSelectedIds(new Set(filteredPeople.map(p => p.id)));
                          }}
                      >
                          Select All
                      </Button>
                    )}
                    {isSelectionActive && (
                       <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Deselect All
                        </Button>
                    )}
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
        </div>

        {filteredPeople.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No contacts found.</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}

        {view === "card" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPeople.map((person) => {
                const personGroups = groups.filter(g => g.peopleIds.includes(person.id));
                return (
                  <PersonCard
                    key={person.id}
                    person={person}
                    isSelected={selectedIds.has(person.id)}
                    onSelectionChange={handleSelectionChange}
                    groups={personGroups}
                    isSelectionActive={isSelectionActive}
                  />
                )
            })}
          </div>
        ) : (
          <PersonTable
            people={filteredPeople}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
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
                title="FOLK SPIRITUAL GEMS"
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
                        <DropdownMenuItem onClick={handleFileImport} disabled={isLoadingAction}>
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
