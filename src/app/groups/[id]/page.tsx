
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  List,
  LayoutGrid,
  Users,
  UserCheck,
  Trash2,
  Search,
  PlusCircle,
} from 'lucide-react';
import type { Person, Group, AppUser } from '@/lib/types';
import { occupationStatuses } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getGroup, updateGroup, addPeopleToGroup, getGroups } from '@/services/groups-service';
import { getPeople, updatePerson, assignHelperToPeople } from '@/services/people-service';
import { getEnablers, getContactSources, type EnablerOption } from '@/services/settings-service';
import { AuthGuard } from '@/components/auth-guard';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useAuth } from '@/contexts/auth-context';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonTable } from '@/components/person-table';
import { PersonCard } from '@/components/person-card';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { ManageGroupMembersDialog } from '@/components/manage-group-members-dialog';
import { AssignHelperDialog } from '@/components/assign-helper-dialog';
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { FilterPopover, type FilterRule, type FilterableField } from '@/components/filter-popover';
import { SortPopover, type SortDescriptor } from '@/components/sort-popover';
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

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { appUser } = useAuth();
  const groupId = params.id as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [group, setGroup] = React.useState<Group | null>(null);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);
  const [members, setMembers] = React.useState<Person[]>([]);
  
  const [view, setView] = React.useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([{ field: 'createdAt', direction: 'desc' }]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const canAssignHelper = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = React.useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignHelperDialogOpen, setIsAssignHelperDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const isSelectionActive = selectedIds.size > 0;

  const fetchPageData = React.useCallback(async () => {
    if (!groupId || !appUser) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [groupData, peopleData, allGroupsData, enablersData, sourcesData] = await Promise.all([
        getGroup(groupId),
        getPeople(appUser),
        getGroups(appUser),
        getEnablers(appUser, 'filter'),
        getContactSources(),
      ]);

      setAllPeople(peopleData);
      setAllGroups(allGroupsData);
      setEnablerOptions(enablersData);
      setContactSourceOptions(sourcesData);

      if (groupData) {
        setGroup(groupData);
        const groupMembers = peopleData.filter(p => groupData.peopleIds.includes(p.id));
        setMembers(groupMembers);
      } else {
        toast({ variant: 'destructive', title: 'Group not found' });
        router.push('/groups');
      }
    } catch (error) {
      console.error('Failed to load group data', error);
      if (error instanceof Error) setFetchError(error);
      else setFetchError(new Error("An unknown error occurred."));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, appUser, router, toast]);

  React.useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  const filterableFields: FilterableField[] = React.useMemo(() => [
    // Same fields as contacts page
    { value: 'fullName', label: 'Name', type: 'string' },
    { value: 'phone', label: 'Phone', type: 'string' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'sgRating', label: 'Rating', type: 'number' },
    { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationStatuses.map(s => ({ value: s, label: s })) },
    { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
    { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
    { value: 'chantingStatus', label: 'Chanting Status', type: 'string' },
    { value: 'nativePlace', label: 'Native Place', type: 'string' },
    { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
    { value: 'assignedHelperName', label: 'Assigned Helper', type: 'string' },
  ], [enablerOptions, contactSourceOptions]);

  const filteredMembers = React.useMemo(() => {
    let tempPeople = [...members];

    if (searchTerm.trim()) {
        const lowercasedFilter = searchTerm.trim().toLowerCase();
        tempPeople = tempPeople.filter(person => 
            person.fullName.toLowerCase().includes(lowercasedFilter) || 
            person.phone.includes(lowercasedFilter)
        );
    }

    if (filters.length > 0) {
      tempPeople = tempPeople.filter(person => {
        return filters.every(filter => {
          const personValue = person[filter.field as keyof Person];
          if (filter.operator === 'is_empty') return personValue === null || personValue === undefined || personValue === '';
          if (filter.operator === 'is_not_empty') return personValue !== null && personValue !== undefined && personValue !== '';
          if (personValue === null || personValue === undefined) return false;
          const filterValue = filter.value;
          if (typeof filter.value === 'undefined' || filter.value === null || filter.value === '') return true;
          const personString = String(personValue).toLowerCase();
          const filterString = String(filterValue).toLowerCase();

          switch (filter.operator) {
            case 'contains': return personString.includes(filterString);
            case 'not_contains': return !personString.includes(filterString);
            case 'is': return personString === filterString;
            case 'is_not': return personString !== filterString;
            case 'eq': return Number(personValue) === Number(filterValue);
            case 'neq': return Number(personValue) !== Number(filterValue);
            case 'gt': return Number(personValue) > Number(filterValue);
            case 'lt': return Number(personValue) < Number(filterValue);
            case 'gte': return Number(personValue) >= Number(filterValue);
            case 'lte': return Number(personValue) <= Number(filterValue);
            default: return true;
          }
        });
      });
    }

    return tempPeople.sort((a, b) => {
      for (const { field, direction } of sortDescriptors) {
        const valA = a[field as keyof Person];
        const valB = b[field as keyof Person];
        let comparison = 0;
        if (valA == null && valB != null) comparison = 1;
        else if (valA != null && valB == null) comparison = -1;
        else if (valA == null && valB == null) comparison = 0;
        else if (field === 'createdAt' || field === 'lastCallAt') {
            const dateA = (valA as any)?.toDate ? (valA as any).toDate() : new Date(0);
            const dateB = (valB as any)?.toDate ? (valB as any).toDate() : new Date(0);
            comparison = dateA.getTime() - dateB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, undefined, { numeric: true });
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        if (comparison !== 0) return direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [members, searchTerm, filters, sortDescriptors]);

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, sortDescriptors, searchTerm]);

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
  };
  
  const removeMembersFromGroup = async (idsToRemove: string[]) => {
    if (!group) return;
    const updatedPeopleIds = group.peopleIds.filter(id => !idsToRemove.includes(id));
    await handleSaveMembers(updatedPeopleIds);
    toast({
      title: 'Members Removed',
      description: `${idsToRemove.length} contact(s) have been removed from this group.`,
    });
    setSelectedIds(new Set());
  };
  
  const handleSavePersonDialog = async (personData: Omit<Person, 'id' | 'progress'>) => {
    if (!editingPerson) return;
    try {
      await updatePerson(editingPerson.id, personData);
      const updatedPerson = { ...editingPerson, ...personData };
      setAllPeople(allPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      setMembers(members.map(m => m.id === updatedPerson.id ? updatedPerson : m));
      setEditingPerson(undefined);
      toast({ title: 'Person Updated', description: "The person's details have been saved." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update person details.'});
    }
  };
  
  const handleSaveMembers = async (memberIds: string[]) => {
    if (!group) return;
    try {
      const updatedGroupData = { peopleIds: memberIds, memberCount: memberIds.length };
      await updateGroup(groupId, updatedGroupData);
      const updatedGroup = { ...group, ...updatedGroupData };
      setGroup(updatedGroup);
      setMembers(allPeople.filter(p => memberIds.includes(p.id)));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update group members.'});
    }
  };
  
  const handleSelectionChange = React.useCallback((personId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(personId);
      else newSet.delete(personId);
      return newSet;
    });
  }, []);

  const handleAddToGroup = async (targetGroupId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await addPeopleToGroup(targetGroupId, Array.from(selectedIds));
      toast({ title: 'Members Added', description: `${selectedIds.size} contacts have been added to the other group.` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add contacts to the group.'});
    }
  };

  const handleAssignHelper = async (helper: AppUser | null) => {
    if (selectedIds.size === 0) return;
    try {
      await assignHelperToPeople(Array.from(selectedIds), helper);
      toast({ title: helper ? 'Helper Assigned' : 'Helper Unassigned', description: `${selectedIds.size} contacts have been updated.` });
      fetchPageData(); // Refetch to show changes
      setSelectedIds(new Set());
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not assign helper.' });
    }
  }

  const renderContent = () => {
    if (isLoading) return <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (fetchError) return <FirebaseConfigError error={fetchError} />;
    if (!group) return null;

    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {isSelectionActive ? (
                <>
                  <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Add to Group</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allGroups.filter(g => g.id !== groupId).map((g) => <DropdownMenuItem key={g.id} onSelect={() => handleAddToGroup(g.id)}>{g.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {canAssignHelper && <Button variant="outline" size="sm" onClick={() => setIsAssignHelperDialogOpen(true)}><UserCheck className="mr-2 h-4 w-4" /> Assign Helper</Button>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove from Group</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove the selected {selectedIds.size} contacts from this group. It will not delete them from the app.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeMembersFromGroup(Array.from(selectedIds))} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or phone..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  <FilterPopover filters={filters} setFilters={setFilters} filterableFields={filterableFields} />
                  <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
                </>
              )}
               {filteredMembers.length > 0 && <Button variant="outline" size="sm" onClick={() => { if (selectedIds.size === filteredMembers.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filteredMembers.map(p => p.id))); } }}>{selectedIds.size === filteredMembers.length ? 'Deselect All' : 'Select All'}</Button>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-muted p-1">
                <Button variant={view === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("card")} aria-label="Card View"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("table")} aria-label="Table View"><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><p>No members found.</p><p className="text-sm">Try adjusting your search or filters.</p></div>
        ) : view === 'card' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMembers.map((person) => <PersonCard key={person.id} person={person} isSelected={selectedIds.has(person.id)} onSelectionChange={handleSelectionChange} groups={allGroups.filter(g => g.peopleIds.includes(person.id))} isSelectionActive={isSelectionActive} />)}
          </div>
        ) : (
          <PersonTable people={filteredMembers} onEdit={handleEditPerson} onDelete={(id) => removeMembersFromGroup([id])} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
        )}
      </>
    );
  };
  
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col bg-background">
          <AppSidebar />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
              {group && !fetchError && (
                  <PageHeader title={group.name} description={group.description || 'No description for this group.'}>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="w-9 sm:w-auto" onClick={() => router.push('/groups')}><ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Back to Groups</span></Button>
                        <Button size="sm" className="w-9 sm:w-auto" onClick={() => setIsManageMembersDialogOpen(true)}><UserPlus className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Manage Members</span></Button>
                      </div>
                  </PageHeader>
              )}
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
                {renderContent()}
              </main>
          </div>
        
        {editingPerson && <CreateUpdatePersonDialog isOpen={!!editingPerson} setIsOpen={() => setEditingPerson(undefined)} onSave={(data) => handleSavePersonDialog(data)} person={editingPerson} allPeople={allPeople} />}
        {group && <ManageGroupMembersDialog isOpen={isManageMembersDialogOpen} setIsOpen={setIsManageMembersDialogOpen} onSave={handleSaveMembers} group={group} allPeople={allPeople} />}
        {isAssignHelperDialogOpen && <AssignHelperDialog isOpen={isAssignHelperDialogOpen} setIsOpen={setIsAssignHelperDialogOpen} onSave={handleAssignHelper} peopleCount={selectedIds.size} />}
      </div>
    </AuthGuard>
  );
}

    