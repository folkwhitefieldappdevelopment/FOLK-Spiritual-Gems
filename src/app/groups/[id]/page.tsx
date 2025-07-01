
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import type { Person, Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getGroup, updateGroup } from '@/services/groups-service';
import { getPeople, updatePerson } from '@/services/people-service';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PersonTable } from '@/components/person-table';
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { ManageGroupMembersDialog } from '@/components/manage-group-members-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseConfigError } from '@/components/firebase-config-error';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const groupId = params.id as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [members, setMembers] = React.useState<Person[]>([]);
  
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [configError, setConfigError] = React.useState(false);

  React.useEffect(() => {
    if (!groupId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [groupData, peopleData] = await Promise.all([
          getGroup(groupId),
          getPeople(),
        ]);
        
        setAllPeople(peopleData);
        
        if (groupData) {
          setGroup(groupData);
          const groupMembers = peopleData.filter(p => groupData.peopleIds.includes(p.id));
          setMembers(groupMembers);
        } else {
          toast({
            variant: 'destructive',
            title: 'Group not found',
          });
          router.push('/groups');
        }
      } catch (error) {
        console.error('Failed to load group data', error);
        if (error instanceof Error && error.message.includes('offline')) {
          setConfigError(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load group data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [groupId, router, toast]);
  
  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
  };
  
  const handleDeletePerson = (personId: string) => {
    if (!group) return;
    
    // This function now just removes the person from the current group, not from the app
    const updatedPeopleIds = group.peopleIds.filter(id => id !== personId);
    handleSaveMembers(updatedPeopleIds);

    toast({
      title: 'Member Removed',
      description: 'The person has been removed from this group.',
    });
  };

  const handleSavePersonDialog = async (personData: Omit<Person, 'id' | 'progress'>) => {
    if (!editingPerson) return;
    
    try {
      await updatePerson(editingPerson.id, personData);
      
      const updatedPerson = { ...editingPerson, ...personData };

      const updatedAllPeople = allPeople.map(p => p.id === updatedPerson.id ? updatedPerson : p);
      setAllPeople(updatedAllPeople);
      
      setMembers(members.map(m => m.id === updatedPerson.id ? updatedPerson : m));
      setEditingPerson(undefined);

      toast({
        title: 'Person Updated',
        description: "The person's details have been saved.",
      });
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

      const groupMembers = allPeople.filter(p => memberIds.includes(p.id));
      setMembers(groupMembers);

      toast({
        title: 'Group Members Updated',
        description: `The group now has ${memberIds.length} members.`,
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update group members.'});
    }
  };
  
  if (configError) {
    return <FirebaseConfigError />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col items-center justify-center bg-background">
          Loading group...
        </div>
      </div>
    );
  }

  if (!group) {
    return null; // Should be redirected by useEffect
  }

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title={group.name}
            description={group.description || 'No description for this group.'}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/groups')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Groups
              </Button>
              <Button size="sm" onClick={() => setIsManageMembersDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Members
              </Button>
            </div>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <Card>
                <CardHeader>
                    <CardTitle>Members ({group.memberCount})</CardTitle>
                    <CardDescription>
                        The following contacts are members of this group. Use the "Actions" menu to remove someone.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {members.length > 0 ? (
                        <PersonTable
                            people={members}
                            onEdit={handleEditPerson}
                            onDelete={handleDeletePerson}
                        />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>This group has no members yet.</p>
                            <Button variant="link" onClick={() => setIsManageMembersDialogOpen(true)}>Add members now</Button>
                        </div>
                    )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {editingPerson && (
        <CreateUpdatePersonDialog
          isOpen={!!editingPerson}
          setIsOpen={() => setEditingPerson(undefined)}
          onSave={(data) => handleSavePersonDialog(data)}
          person={editingPerson}
        />
      )}
      
      <ManageGroupMembersDialog
        isOpen={isManageMembersDialogOpen}
        setIsOpen={setIsManageMembersDialogOpen}
        onSave={handleSaveMembers}
        group={group}
        allPeople={allPeople}
      />
    </>
  );
}
