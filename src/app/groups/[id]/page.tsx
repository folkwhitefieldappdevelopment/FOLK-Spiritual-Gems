
'use client';

import * as React from 'react';
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  List,
  LayoutGrid,
  Users,
  UserCheck,
  Trash2,
  PlusCircle,
  Share2,
  Upload,
} from 'lucide-react';
import { read, utils, write, type WorkSheet } from "xlsx";
import type { Person, Group, AppUser, CustomField, UserRole, OccupationStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getGroup, getStaticGroups, addPeopleToGroup, removePeopleFromGroup } from '@/services/groups-service';
import { addPeopleToGroupByPhone } from '@/services/groups-actions';
import { getPeople, updatePerson, assignCoEnablerToPeople } from '@/services/people-service';
import { getFolkGuides, updateUser } from '@/services/user-service';
import { getEnablers, getContactSources, getCustomPersonFields, getOccupationStatuses, type EnablerOption, getStayingWithOptions } from '@/services/settings-service';
import { FirebaseConfigError } from '@/components/firebase-config-error';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PersonTable, type FilterState } from '@/components/person-table';
import { PersonCard } from '@/components/person-card';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { ManageGroupMembersDialog } from '@/components/manage-group-members-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { applyClientSideFilters } from '@/lib/filters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { dynamicGroupDefinitions } from '@/lib/dynamic-groups';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { ShareGroupDialog } from '@/components/share-group-dialog';
import { get } from 'lodash';

const ROWS_PER_PAGE = 10;
const FIRESTORE_QUERY_LIMIT = 10000;

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const groupId = params.id as string;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [group, setGroup] = React.useState<Group | null>(null);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);
  const [members, setMembers] = React.useState<Person[]>([]);
  
  const [view, setView] = React.useState<'card' | 'table'>('table');
  const [filters, setFilters] = React.useState<FilterState>({});
  const [sortDescriptors, setSortDescriptors] = React.useState<any[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isShareGroupDialogOpen, setIsShareGroupDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const isSelectionActive = selectedIds.size > 0;
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const page = parseInt(params.get('page') || '1', 10);
    const view = params.get('view') as 'table' | 'card' || 'table';
    const sort = params.get('sort');
    const filter = params.get('filters');

    setCurrentPage(page);
    setView(view);
    if (sort) {
      try { setSortDescriptors(JSON.parse(sort)); } catch(e) {}
    } else {
      setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
    }
    if (filter) {
      try { setFilters(JSON.parse(filter)); } catch(e) {}
    }
  }, []); 

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (view !== 'table') params.set('view', view);
    if (sortDescriptors.length > 0 && !(sortDescriptors.length === 1 && sortDescriptors[0].field === 'createdAt' && sortDescriptors[0].direction === 'desc')) {
      params.set('sort', JSON.stringify(sortDescriptors));
    }
    if (Object.keys(filters).length > 0) {
        params.set('filters', JSON.stringify(filters));
    }
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, view, sortDescriptors, filters, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
        const groupData = await getGroup(groupId);
        if (!groupData) {
             toast({ variant: 'destructive', title: 'Group not found' });
             router.push('/groups');
             return;
        }
        setGroup(groupData);
        
        const { people: allVisiblePeople } = await getPeople({ pageSize: FIRESTORE_QUERY_LIMIT });
        setAllPeople(allVisiblePeople);

        let memberData: Person[];
        if (groupData.isDynamic) {
            const dynamicGroupDef = dynamicGroupDefinitions.find(def => def.id === groupId);
            memberData = dynamicGroupDef ? allVisiblePeople.filter(dynamicGroupDef.filter) : [];
        } else {
            const memberIds = new Set(groupData.peopleIds);
            memberData = allVisiblePeople.filter(p => memberIds.has(p.id));
        }
        setMembers(memberData);
        
      const [allGroupsData, guidesData, customFieldsData] = await Promise.all([
        getStaticGroups(),
        getFolkGuides(),
        getCustomPersonFields(),
      ]);
      
      setAllGroups(allGroupsData);
      setFolkGuides(guidesData);
      setCustomFields(customFieldsData);

    } catch (error) {
      console.error('Failed to load group data', error);
      if (error instanceof Error) setFetchError(error);
      else setFetchError(new Error("An unknown error occurred."));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, router, toast]);

  React.useEffect(() => {
    if (groupId) {
      fetchPageData();
    }
  }, [groupId, fetchPageData]);

  const filteredAndSortedMembers = React.useMemo(() => {
    let people = [...members];
    
    people = applyClientSideFilters(people, filters);

    if (sortDescriptors.length > 0) {
        people.sort((a, b) => {
            for (const desc of sortDescriptors) {
                const valA = get(a, desc.field);
                const valB = get(b, desc.field);
                let comparison = 0;
                if (valA === null || valA === undefined) comparison = -1;
                else if (valB === null || valB === undefined) comparison = 1;
                else if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                if (comparison !== 0) {
                    return desc.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }

    return people;
  }, [members, filters, sortDescriptors]);
  
  const totalPages = Math.ceil(filteredAndSortedMembers.length / ROWS_PER_PAGE);
  const paginatedMembers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedMembers.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAndSortedMembers, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, view]);

  const handleEditPerson = React.useCallback((person: Person) => {
    setEditingPerson(person);
  }, []);
  
  const handleRemoveMembers = React.useCallback(async (idsToRemove: string[]) => {
    if (!group || group.isDynamic) return;
    try {
      await removePeopleFromGroup(group.id, idsToRemove);
      fetchPageData(); // Refetch data
      toast({
        title: 'Members Removed',
        description: `${idsToRemove.length} contact(s) have been removed from this group.`,
      });
      setSelectedIds(new Set());
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error removing members' });
    }
  }, [group, toast, fetchPageData]);
  
  const handleSavePersonDialog = React.useCallback(async (personData: Omit<Person, 'id' | 'progress' | 'createdAt'>) => {
    if (!editingPerson) return;
    try {
      await updatePerson(editingPerson.id, personData);
      
      const updatedPerson = { ...editingPerson, ...personData };
      setMembers(members.map(m => m.id === updatedPerson.id ? updatedPerson : m));
      setAllPeople(allPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p));

      setEditingPerson(undefined);
      toast({ title: 'Person Updated', description: "The person's details have been saved." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update person details.'});
    }
  }, [editingPerson, members, allPeople, toast]);
  
  const handleSaveMembers = React.useCallback(async (memberIds: string[]) => {
    if (!group || group.isDynamic) return;
    try {
      await addPeopleToGroup(groupId, memberIds);
      await fetchPageData(); 
      toast({title: 'Members Updated', description: `Group members for '${group.name}' have been saved.`});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update group members.'});
    }
  }, [group, groupId, toast, fetchPageData]);
  
  const handleSelectionChange = React.useCallback((personId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(personId);
      else newSet.delete(personId);
      return newSet;
    });
  }, []);

  const handleAddToGroup = React.useCallback(async (targetGroupId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await addPeopleToGroup(targetGroupId, Array.from(selectedIds));
      toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.'});
    }
  }, [selectedIds, toast]);

  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (selectedIds.size === 0) return;
    try {
      await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler);
      toast({ title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned', description: `${selectedIds.size} contacts have been updated.` });
      fetchPageData(); // Refetch to show changes
      setSelectedIds(new Set());
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not assign co-enabler." });
    }
  }, [selectedIds, toast, fetchPageData]);

  const handleExportMembers = React.useCallback(() => {
    if (!group || members.length === 0) return;
    const dataToExport = members.map(m => ({ fullName: m.fullName, phone: m.phone }));
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Members');
    write(workbook, { bookType: 'xlsx', type: 'buffer' });
    write(workbook, { bookType: 'xlsx', type: 'binary' });
    utils.writeFile(workbook, `${group.name}_members.xlsx`);
    toast({ title: 'Export Complete', description: `${members.length} members exported.`});
  }, [group, members, toast]);

  const handleImportMembers = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !group) return;
    
    setIsImporting(true);
    
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = utils.sheet_to_json<any>(worksheet);
                const phoneNumbers = json.map(row => String(row.phone).trim()).filter(Boolean);

                if (phoneNumbers.length === 0) {
                    throw new Error("No phone numbers found in the file.");
                }
                
                const result = await addPeopleToGroupByPhone(groupId, phoneNumbers);

                toast({
                    title: 'Import Complete',
                    description: `${result.addedCount} new members added to the group. ${result.existingCount} were already members. ${result.notFoundCount} phone numbers were not found.`
                });
                await fetchPageData(); // Refresh data

            } catch(err) {
                toast({ variant: 'destructive', title: 'Import Failed', description: err instanceof Error ? err.message : 'Could not process file.' });
            } finally {
                setIsImporting(false);
                if (event.target) event.target.value = ''; // Reset file input
            }
        };
        reader.readAsArrayBuffer(file);
    } catch(err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not read the file.' });
        setIsImporting(false);
    }

  }, [group, groupId, toast, fetchPageData]);

  const renderContent = () => {
    if (isLoading) return <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (fetchError) return <FirebaseConfigError error={fetchError} />;
    if (!group) return null;

    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md bg-muted p-1">
                    <Button variant={view === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("card")} aria-label="Card View"><LayoutGrid className="h-4 w-4" /></Button>
                    <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("table")} aria-label="Table View"><List className="h-4 w-4" /></Button>
                </div>
            </div>
          </div>
          {isSelectionActive && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border">
                <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                {!group.isDynamic && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Add to Group</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allGroups.filter(g => g.id !== groupId && !g.isDynamic).map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" /> Assign Co-Enabler</Button>
                {!group.isDynamic && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove from Group</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove the selected {selectedIds.size} contacts from this group. It will not delete them from the app.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMembers(Array.from(selectedIds))} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto">Deselect All</Button>
              </div>
          )}
        </div>

        {view === 'table' ? (
          <PersonTable 
            people={paginatedMembers} 
            allPeople={allPeople}
            allPeopleCount={filteredAndSortedMembers.length}
            onEdit={handleEditPerson} 
            onDelete={(id) => handleRemoveMembers([id])} 
            selectedIds={selectedIds} 
            setSelectedIds={setSelectedIds} 
            isSelectionActive={isSelectionActive}
            sortDescriptors={sortDescriptors}
            setSortDescriptors={setSortDescriptors}
            filters={filters}
            setFilters={setFilters}
          />
        ) : (
           paginatedMembers.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedMembers.map((person) => {
                  const personGroups = allGroups.filter(g => g.peopleIds.includes(person.id));
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
            <div className="text-center py-12 text-muted-foreground"><p>No members found.</p><p className="text-sm">Try adjusting your search or filters.</p></div>
          )
        )}
        {totalPages > 1 && (
            <Pagination className="mt-8">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="p-2 text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
      </>
    );
  };
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            {group && !fetchError && (
                <PageHeader title={group.name} description={group.description || 'No description for this group.'}>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="w-9 sm:w-auto" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Back</span></Button>
                      {!group.isDynamic && 
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" disabled={isImporting}>
                                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Import/Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>Import Members</DropdownMenuItem>
                                <DropdownMenuItem onSelect={handleExportMembers}>Export Members</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      }
                      {!group.isDynamic && <Button size="sm" className="w-9 sm:w-auto" onClick={() => setIsManageMembersDialogOpen(true)}><UserPlus className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Manage Members</span></Button>}
                      <Button size="sm" variant="outline" className="w-9 sm:w-auto" onClick={() => setIsShareGroupDialogOpen(true)}><Share2 className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Share</span></Button>
                    </div>
                </PageHeader>
            )}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
                {renderContent()}
            </main>
        </div>
      
      <input type="file" ref={fileInputRef} onChange={handleImportMembers} className="hidden" accept=".xlsx, .xls" />
      {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={handleSavePersonDialog} person={editingPerson} allPeople={allPeople} />}
      {group && !group.isDynamic && <ManageGroupMembersDialog isOpen={isManageMembersDialogOpen} setIsOpen={setIsManageMembersDialogOpen} onSave={handleSaveMembers} group={group} allPeople={allPeople} />}
      {isAssignCoEnablerDialogOpen && <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={handleAssignCoEnabler} peopleCount={selectedIds.size} />}
      {group && <ShareGroupDialog isOpen={isShareGroupDialogOpen} setIsOpen={setIsShareGroupDialogOpen} group={group} members={members} />}
    </div>
  );
}
