
"use client";
import * as React from "react";
import { PlusCircle } from "lucide-react";
import type { Group } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getGroups, createGroup, updateGroup, deleteGroup } from "@/services/groups-service";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";

export default function GroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(
    undefined
  );
  const [configError, setConfigError] = React.useState(false);

  React.useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const groupsData = await getGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error("Failed to fetch groups", error);
        if (error instanceof Error && (error.message.includes('offline') || error.message.includes('permission-denied'))) {
          setConfigError(true);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load groups.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, [toast]);

  const handleCreateGroup = () => {
    setEditingGroup(undefined);
    setIsDialogOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast({ title: "Group Deleted", description: "The group has been removed." });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not delete group." });
    }
  };

  const handleSaveGroup = async (
    groupData: Omit<Group, "id" | "memberCount" | "peopleIds">
  ) => {
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
        const newGroupData: Omit<Group, 'id'> = {
          memberCount: 0,
          peopleIds: [],
          ...groupData,
        };
        const newGroup = await createGroup(newGroupData);
        setGroups((prev) => [...prev, newGroup]);
        toast({
          title: "Group Created",
          description: "The new group has been added.",
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save group." });
    }
  };
  
  if (configError) {
    return <FirebaseConfigError />;
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-12">Loading groups...</div>
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
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Groups"
            description={`Manage your created groups. You have ${groups.length} groups.`}
          >
            <Button size="sm" onClick={handleCreateGroup}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
      <CreateUpdateGroupDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSave={handleSaveGroup}
        group={editingGroup}
      />
    </>
  );
}
