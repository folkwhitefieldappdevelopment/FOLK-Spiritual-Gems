"use client";
import * as React from "react";
import { PlusCircle } from "lucide-react";
import { mockGroups } from "@/lib/data";
import type { Group } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";

export default function GroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(
    undefined
  );

  React.useEffect(() => {
    try {
      const storedGroups = localStorage.getItem("groups");
      if (storedGroups) {
        setGroups(JSON.parse(storedGroups));
      } else {
        setGroups(mockGroups);
      }
    } catch (error) {
      console.error("Failed to parse groups from localStorage", error);
      setGroups(mockGroups);
    }
  }, []);

  React.useEffect(() => {
    // A simple check to avoid overwriting on initial empty state
    if (groups.length > 0) {
      localStorage.setItem("groups", JSON.stringify(groups));
    }
  }, [groups]);

  const handleCreateGroup = () => {
    setEditingGroup(undefined);
    setIsDialogOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast({ title: "Group Deleted", description: "The group has been removed." });
  };

  const handleSaveGroup = (
    groupData: Omit<Group, "id" | "memberCount" | "peopleIds">
  ) => {
    if (editingGroup) {
      // Update existing group
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
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        memberCount: 0,
        peopleIds: [],
        ...groupData,
      };
      setGroups((prev) => [...prev, newGroup]);
      toast({
        title: "Group Created",
        description: "The new group has been added.",
      });
    }
  };

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
