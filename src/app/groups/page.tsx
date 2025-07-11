
"use client";
import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import type { Group } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getGroups, createGroup, updateGroup, deleteGroup } from "@/services/groups-service";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import { useAuth } from "@/contexts/auth-context";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";

export default function GroupsPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(
    undefined
  );

  React.useEffect(() => {
    if (!appUser) return;
    const fetchGroups = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const groupsData = await getGroups(appUser);
        setGroups(groupsData);
      } catch (error) {
        console.error("Failed to fetch groups", error);
        if (error instanceof Error) {
            setFetchError(error);
        } else {
            setFetchError(new Error("An unknown error occurred while fetching data."));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, [appUser]);

  const handleCreateGroup = React.useCallback(() => {
    setEditingGroup(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleEditGroup = React.useCallback((group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteGroup = React.useCallback(async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast({ title: "Group Deleted", description: "The group has been removed." });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not delete group." });
    }
  }, [toast]);

  const handleSaveGroup = React.useCallback(async (
    groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">
  ) => {
    if (!appUser) return;
    try {
      if (editingGroup) {
        // Update existing group
        await updateGroup(editingGroup.id, groupData);
        setGroups((prev) =>
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
        setGroups((prev) => [...prev, newGroup]);
        toast({
          title: "Group Created",
          description: "The new group has been added.",
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save group." });
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

    if (groups.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No groups found.</p>
          <p className="text-sm">Click "Create Group" to get started.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group) => (
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
          description={`Manage your created groups. You have ${groups.length} groups.`}
        >
          <Button size="sm" onClick={handleCreateGroup}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </PageHeader>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
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
