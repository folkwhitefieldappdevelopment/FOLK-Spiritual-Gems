
"use client";
import * as React from "react";
import { PlusCircle, Loader2, Bot, Users as UsersIcon, User, UserCog } from "lucide-react";
import type { Group, AppUser, Person } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAllGroups, createGroup, updateGroup, deleteGroup } from "@/services/groups-service";
import { getPeople } from "@/services/people-service";
import { getEnablersForGuide, getFolkGuides, getUsers } from "@/services/user-service";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function GroupsPageComponent() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(undefined);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewFilter, setViewFilter] = React.useState('all'); // 'all' or 'mine'
  const [userFilterId, setUserFilterId] = React.useState('all'); // 'all', or a user ID

  const isAdmin = appUser?.role.includes('Admin');
  const isGuide = appUser?.role.includes('Folk Guide');

  React.useEffect(() => {
    if (!appUser) return;
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [peopleData, usersData] = await Promise.all([
            getPeople(appUser),
            getUsers(),
        ]);
        setPeople(peopleData);
        setAllUsers(usersData);

        // This gets all static groups the user can see
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
  
  const getUserFilterDataSource = () => {
    if(isAdmin) return allUsers.filter(u => u.role.includes('Folk Guide'));
    if(isGuide) return allUsers.filter(u => u.reportsTo?.guideId === appUser?.id);
    return [];
  }

  const filteredGroups = React.useMemo(() => {
    // 1. Filter people based on the user filter (Guide or Enabler)
    let relevantPeople = people;
    if (userFilterId !== 'all') {
      if (isAdmin) { // Admin filtering by a Folk Guide
        const guide = allUsers.find(u => u.id === userFilterId);
        if (guide) {
          const enablerIds = allUsers.filter(u => u.reportsTo?.guideId === guide.id).map(u => u.id);
          const teamIds = new Set([guide.id, ...enablerIds]);
          relevantPeople = people.filter(p => p.folkGuideId && teamIds.has(p.folkGuideId));
        }
      } else if (isGuide) { // Guide filtering by an Enabler
        if (userFilterId === '__UNASSIGNED__') {
          relevantPeople = people.filter(p => !p.enablerInTouchWith && p.folkGuideId === appUser?.id);
        } else {
          const enabler = allUsers.find(e => e.id === userFilterId);
          if (enabler) {
            relevantPeople = people.filter(p => p.enablerInTouchWith === enabler.name);
          }
        }
      }
    }
    const relevantPeopleIds = new Set(relevantPeople.map(p => p.id));

    // 2. Filter groups based on the view filter (All or My Groups)
    let baseGroups = allGroups;
    if (viewFilter === 'mine') {
      baseGroups = allGroups.filter(g => !g.isDynamic && g.createdBy === appUser?.id);
    }
    
    // 3. Process the groups: update counts and add dynamic groups
    const processedGroups = baseGroups.map(group => {
      // For dynamic groups, re-generate them with the filtered people list
      if (group.isDynamic) {
        const dynamicDef = generateDynamicGroups(relevantPeople).find(dg => dg.id === group.id);
        return {
          ...group,
          peopleIds: dynamicDef?.peopleIds || [],
          memberCount: dynamicDef?.memberCount || 0,
        };
      }
      // For static groups, filter their members and update the count
      const filteredMembers = group.peopleIds.filter(id => relevantPeopleIds.has(id));
      return {
        ...group,
        filteredMemberCount: filteredMembers.length,
      };
    }).filter(group => {
        // Only show groups that have members matching the filter, unless no filter is applied
        return userFilterId === 'all' || (group.isDynamic ? group.memberCount > 0 : (group.filteredMemberCount || 0) > 0);
    });

    // 4. Apply search term
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      return processedGroups.filter(g => 
        g.name.toLowerCase().includes(lowercasedTerm) || 
        (g.description || '').toLowerCase().includes(lowercasedTerm)
      );
    }
    
    return processedGroups.sort((a,b) => a.name.localeCompare(b.name));
  }, [allGroups, people, allUsers, userFilterId, searchTerm, isAdmin, isGuide, appUser, viewFilter]);

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
    groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy" | "creatorRole">
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
        {filteredGroups.map((group) => {
          const owner = allUsers.find(u => u.id === group.createdBy);
          const memberCount = userFilterId === 'all' || group.isDynamic
              ? group.memberCount
              : group.filteredMemberCount;
          const totalCount = group.isDynamic ? undefined : group.memberCount;

          return (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={() => handleEditGroup(group)}
              onDelete={() => handleDeleteGroup(group.id)}
              ownerName={owner?.name}
              displayMemberCount={memberCount}
              totalMemberCount={totalCount}
            />
          );
        })}
      </div>
    );
  }
  
  const renderUserFilter = () => {
    const filterOptions = getUserFilterDataSource();
    if (!isAdmin && !isGuide) return null;

    let filterLabel = "Filter by User...";
    let Icon = UsersIcon;
    if (isAdmin) {
      filterLabel = "Filter by Folk Guide...";
      Icon = UsersIcon;
    } else if (isGuide) {
      filterLabel = "Filter by Enabler...";
      Icon = UserCog;
    }

    return (
      <Select value={userFilterId} onValueChange={setUserFilterId}>
        <SelectTrigger className="w-full sm:w-[280px]">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={filterLabel} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          {isGuide && <SelectItem value="__UNASSIGNED__">Unassigned Contacts</SelectItem>}
          {filterOptions.map(u => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} {isAdmin && `(${u.fgCode || 'N/A'})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
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
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  className="pl-10 w-full sm:w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {renderUserFilter()}
            </div>
            <Tabs value={viewFilter} onValueChange={setViewFilter} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="all">All Groups</TabsTrigger>
                <TabsTrigger value="mine">My Groups</TabsTrigger>
              </TabsList>
            </Tabs>
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
