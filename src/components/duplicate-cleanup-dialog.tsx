
'use client';

import * as React from 'react';
import { Loader2, Search, Users, UserPlus, Trash2, AlertTriangle, X } from 'lucide-react';
import type { Person, Group, AppUser } from '@/lib/types';
import { scanForDuplicates, deletePeople, assignEnablerToPeople } from '@/services/people-service';
import { addPeopleToGroup, getStaticGroups } from '@/services/groups-service';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonTable } from '@/components/person-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssignEnablerDialog } from '@/components/assign-enabler-dialog';
import { CreateUpdateGroupDialog } from '@/components/create-update-group-dialog';
import { createGroup } from '@/services/groups-service';

type DuplicateCleanupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onRefresh: () => void;
};

export function DuplicateCleanupDialog({ isOpen, setIsOpen, onRefresh }: DuplicateCleanupDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const [isAssignEnablerOpen, setIsAssignEnablerOpen] = React.useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      const [duplicateGroups, staticGroups] = await Promise.all([
        scanForDuplicates(appUser),
        getStaticGroups(appUser)
      ]);
      
      // Flatten the duplicate groups into a single array for the table
      const flattened = Object.values(duplicateGroups).flat();
      // Sort by phone number so duplicates are adjacent
      flattened.sort((a, b) => a.phone.localeCompare(b.phone));
      
      setPeople(flattened);
      setAllGroups(staticGroups);
      setSelectedIds(new Set());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Scan Failed', description: 'Could not search for duplicates.' });
    } finally {
      setIsLoading(false);
    }
  }, [appUser, toast]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const filteredPeople = React.useMemo(() => {
    if (!searchTerm) return people;
    const lower = searchTerm.toLowerCase();
    return people.filter(p => 
      p.fullName.toLowerCase().includes(lower) || 
      p.phone.includes(searchTerm) ||
      p.enablerInTouchWith?.toLowerCase().includes(lower)
    );
  }, [people, searchTerm]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !appUser) return;
    try {
      await deletePeople(Array.from(selectedIds), appUser);
      toast({ title: 'Records Deleted', description: `${selectedIds.size} contacts removed.` });
      loadData();
      onRefresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete contacts.' });
    }
  };

  const handleBulkAssignEnabler = async (enabler: AppUser) => {
    if (selectedIds.size === 0 || !appUser) return;
    try {
      await assignEnablerToPeople(Array.from(selectedIds), enabler, appUser);
      toast({ title: 'Enabler Assigned', description: `${selectedIds.size} contacts reassigned to ${enabler.name}.` });
      loadData();
      onRefresh();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not reassign contacts.' });
    }
  };

  const handleBulkAddToGroup = async (groupId: string) => {
    if (selectedIds.size === 0 || !appUser) return;
    try {
      await addPeopleToGroup(groupId, Array.from(selectedIds), appUser);
      toast({ title: 'Added to Group', description: `${selectedIds.size} contacts added.` });
      setSelectedIds(new Set());
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add to group.' });
    }
  };

  const handleCreateGroupAndAdd = async (groupData: any) => {
    if (!appUser) return;
    try {
      const newGroup = await createGroup(groupData, appUser);
      await addPeopleToGroup(newGroup.id, Array.from(selectedIds), appUser);
      toast({ title: 'Group Created', description: `Group "${newGroup.name}" created with ${selectedIds.size} members.` });
      loadData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const isSelectionActive = selectedIds.size > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Review & Manage Duplicates
              </DialogTitle>
              <DialogDescription>
                Review contacts with identical phone numbers. You can select them to reassign, organize, or remove.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search duplicates by name, phone or enabler..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {isSelectionActive && (
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border animate-in fade-in slide-in-from-right-4">
                <span className="px-3 text-sm font-bold">{selectedIds.size} selected</span>
                <Button variant="outline" size="sm" onClick={() => setIsAssignEnablerOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Assign Enabler
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" /> Add to Group
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {allGroups.map(g => (
                      <DropdownMenuItem key={g.id} onSelect={() => handleBulkAddToGroup(g.id)}>
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsCreateGroupOpen(true)}>
                      Create New Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 border rounded-xl overflow-hidden shadow-inner bg-card">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Scanning database...</p>
              </div>
            ) : filteredPeople.length > 0 ? (
              <PersonTable
                people={filteredPeople}
                onEdit={() => {}}
                onDelete={(id) => {
                  setSelectedIds(new Set([id]));
                  handleBulkDelete();
                }}
                onStartCall={() => {}}
                isSelectionActive={true}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                showEnablerColumn={true}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="font-bold text-lg">No Duplicates Identified</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  We couldn't find any multiple records with the same phone number in your current view.
                </p>
              </div>
            )}
          </div>
        </div>

        <AssignEnablerDialog
          isOpen={isAssignEnablerOpen}
          setIsOpen={setIsAssignEnablerOpen}
          onSave={handleBulkAssignEnabler}
          peopleCount={selectedIds.size}
        />
        <CreateUpdateGroupDialog
          isOpen={isCreateGroupOpen}
          setIsOpen={setIsCreateGroupOpen}
          onSave={handleCreateGroupAndAdd}
        />
      </DialogContent>
    </Dialog>
  );
}
