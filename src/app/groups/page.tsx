"use client";
import * as React from "react";
import { PlusCircle } from "lucide-react";
import { mockGroups } from "@/lib/data";
import type { Group } from "@/lib/types";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";

export default function GroupsPage() {
  const [groups, setGroups] = React.useState<Group[]>(mockGroups);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(
    undefined
  );

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
  };

  const handleSaveGroup = (groupData: Omit<Group, "id" | "memberCount" | "peopleIds">) => {
    if (editingGroup) {
      // Update existing group
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id ? { ...g, ...groupData } : g
        )
      );
    } else {
      // Create new group
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        memberCount: 0,
        peopleIds: [],
        ...groupData,
      };
      setGroups((prev) => [...prev, newGroup]);
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
