
"use client";
import * as React from "react";
import { PlusCircle, Loader2, Bot } from "lucide-react";
import type { Group, AppUser, Person } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAllGroups, createGroup, updateGroup, deleteGroup } from "@/services/groups-service";
import { getPeople } from "@/services/people-service";
import { getEnablers, type EnablerOption } from "@/services/settings-service";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { useAuth } from "@/contexts/auth-context";
import { generateDynamicGroups } from '@/lib/dynamic-groups';

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { AuthGuard } from "@/components/auth-guard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function GroupsPageComponent() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(undefined);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [enablerFilter, setEnablerFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    if (!appUser) return;
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [peopleData, enablersData] = await Promise.all([
          getPeople(appUser),
          getEnablers(appUser, 'filter'),
        ]);
        setPeople(peopleData);
        setEnablerOptions(enablersData);

        const groupsData = await getAllGroups(appUser, peopleData);
        setAllGroups(groupsData);
      } catch (error) {
        console.error("Failed to fetch groups and people", error);
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

  const filteredGroups = React.useMemo(() => {
    let tempPeople = people;
    
    if (enablerFilter && enablerFilter !== 'all') {
      if (enablerFilter === '__UNASSIGNED__') {
        tempPeople = tempPeople.filter(p => !p.enablerInTouchWith);
      } else {
        tempPeople = tempPeople.filter(p => p.enablerInTouchWith === enablerFilter);
      }
    }
    
    // Re-calculate dynamic groups based on the filtered people
    const staticGroups = allGroups.filter(g => !g.isDynamic);
    const dynamicGroups = generateDynamicGroups(tempPeople);

    let allFilteredGroups = [...staticGroups, ...dynamicGroups];

    if (searchTerm.trim()) {
      allFilteredGroups = allFilteredGroups.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return allFilteredGroups.sort((a,b) => a.name.localeCompare(b.name));
  }, [allGroups, people, enablerFilter, searchTerm]);

  const handleCreateGroup = React.useCallback(() => {
    setEditingGroup(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleEditGroup = React.useCallback((group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteGroup = React.useCallback(async (groupId: string) => {
    if (!appUser) return;
    try {
      await deleteGroup(groupId, appUser);
      setAllGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast({ title: "Group Deleted", description: "The group has been removed." });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not delete group." });
    }
  }, [toast, appUser]);

  const handleSaveGroup = React.useCallback(async (
    groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">
  ) => {
    if (!appUser) return;
    try {
      if (editingGroup) {
        // Update existing group
        await updateGroup(editingGroup.id, groupData, appUser);
        setAllGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id ? { ...g, ...groupData } : g
          )
        );
        toast({
          title: "Group Updated",
          description: "The group details have been saved.",
        });
      } else {
        // Create new group
        const newGroupData: Omit<Group, 'id' | 'createdBy'> = {
          memberCount: 0,
          peopleIds: [],
          ...groupData,
        };
        const newGroup = await createGroup(newGroupData, appUser);
        setAllGroups((prev) => [...prev, newGroup]);
        toast({
          title: "Group Created",
          description: "The new group has been added.",
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save group." });
      throw error;
    }
  }, [appUser, editingGroup, toast]);
  
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

    if (filteredGroups.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No groups found for the current filters.</p>
          <p className="text-sm">Try adjusting your filters or click "Create Group" to get started.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={() => handleEditGroup(group)}
            onDelete={() => handleDeleteGroup(group.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader
          title="Groups"
          description={`Manage your created and smart groups.`}
        >
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreateGroup}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>
        </PageHeader>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                className="pl-10 w-full sm:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={enablerFilter} onValueChange={setEnablerFilter}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filter by enabler..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enablers' Contacts</SelectItem>
                {enablerOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderContent()}
        </main>
      </div>
      <CreateUpdateGroupDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSave={handleSaveGroup}
        group={editingGroup}
      />
    </div>
  );
}

export default function GroupsPage() {
    return (
        <AuthGuard>
            <GroupsPageComponent />
        </AuthGuard>
    )
}
