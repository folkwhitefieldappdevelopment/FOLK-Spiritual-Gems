
"use client";
import * as React from "react";
import { PlusCircle, Loader2, Bot, Users as UsersIcon, User, UserCog } from "lucide-react";
import type { Group, AppUser, Person, UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAllGroups, createGroup, updateGroup, deleteGroup } from "@/services/groups-service";
import { getPeople } from "@/services/people-service";
import { getEnablersForGuide, getFolkGuides, getUsers } from "@/services/user-service";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { useAuth } from "@/contexts/auth-context";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup as UiSelectGroup, SelectLabel } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateDynamicGroups } from "@/lib/dynamic-groups";

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export default function GroupsPage() {
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
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      try {
        const [peopleData, usersData, groupsData] = await Promise.all([
            getPeople(userInfo, { pageSize: 5000 }), // Needed for dynamic groups context
            getUsers(),
            getAllGroups(userInfo),
        ]);
        setPeople(peopleData.people);
        setAllUsers(usersData);
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
  
  const { userFilterOptions, guideUserMap } = React.useMemo(() => {
    const guides = allUsers.filter(u => u.role.includes('Folk Guide')).sort((a,b) => a.name.localeCompare(b.name));
    const enablers = allUsers.filter(u => u.role.includes('Folk Enabler')).sort((a,b) => a.name.localeCompare(b.name));
    const guideMap = new Map(guides.map(g => [g.id, g]));

    let options = { guides: [], enablers: [] } as { guides: AppUser[], enablers: AppUser[] };

    if (isAdmin) {
      options.guides = guides;
      options.enablers = enablers;
    } else if (isGuide) {
      options.enablers = allUsers.filter(u => u.reportsTo?.guideId === appUser?.id);
    }
    
    return { userFilterOptions: options, guideUserMap: guideMap };
  }, [allUsers, isAdmin, isGuide, appUser?.id]);

  const filteredGroups = React.useMemo(() => {
    // 1. Filter people based on the user filter (Guide or Enabler)
    let relevantPeople = people;
    if (userFilterId !== 'all') {
      const selectedUser = allUsers.find(u => u.id === userFilterId);

      if (selectedUser?.role.includes('Folk Guide')) {
        relevantPeople = people.filter(p => p.folkGuideId && p.folkGuideId === selectedUser.id);
      } else if (selectedUser?.role.includes('Folk Enabler')) {
        relevantPeople = people.filter(p => p.enablerInTouchWith === selectedUser.name);
      } else if (userFilterId === '__UNASSIGNED__') {
        relevantPeople = people.filter(p => !p.enablerInTouchWith);
      }
    }
    const relevantPeopleIds = new Set(relevantPeople.map(p => p.id));

    // 2. Filter groups based on the view filter (All or My Groups)
    let baseGroups = allGroups;
    if (viewFilter === 'mine' && appUser) {
      baseGroups = allGroups.filter(g => !g.isDynamic && g.createdBy === appUser?.id);
    }
    
    const staticGroups = baseGroups.filter(g => !g.isDynamic).map(group => {
        const filteredMembers = group.peopleIds.filter(id => relevantPeopleIds.has(id));
        return {
            ...group,
            filteredMemberCount: filteredMembers.length,
        };
    }).filter(group => userFilterId === 'all' || (group.filteredMemberCount || 0) > 0);

    const dynamicGroups = generateDynamicGroups(relevantPeople);

    const combined = [...staticGroups, ...dynamicGroups];

    // 4. Apply search term
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      return combined.filter(g => 
        g.name.toLowerCase().includes(lowercasedTerm) || 
        (g.description || '').toLowerCase().includes(lowercasedTerm)
      );
    }
    
    return combined.sort((a,b) => a.name.localeCompare(b.name));
  }, [allGroups, people, allUsers, userFilterId, searchTerm, appUser, viewFilter]);

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
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await deleteGroup(groupId, userInfo);
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
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      if (editingGroup) {
        // Update existing group
        await updateGroup(editingGroup.id, groupData, userInfo);
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
        const newGroup = await createGroup(newGroupData, userInfo);
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
          const memberCount = group.isDynamic
              ? group.memberCount
              : group.filteredMemberCount ?? group.memberCount;
          
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
    if (!isAdmin && !isGuide) return null;

    let filterLabel = "Filter by User...";
    let Icon = UsersIcon;
    if (isAdmin) {
      filterLabel = "Filter by Guide or Enabler...";
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
          
          {userFilterOptions.guides.length > 0 && (
            <UiSelectGroup>
              <SelectLabel>Folk Guides</SelectLabel>
              {userFilterOptions.guides.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} {isAdmin && `(${u.fgCode || 'N/A'})`}
                </SelectItem>
              ))}
            </UiSelectGroup>
          )}

          {userFilterOptions.enablers.length > 0 && (
            <UiSelectGroup>
              <SelectLabel>Folk Enablers</SelectLabel>
              {userFilterOptions.enablers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </UiSelectGroup>
          )}
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
