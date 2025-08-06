
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Phone, Loader2, Tags, Save, XCircle } from 'lucide-react';
import type { Person, ProgressLevelAnswers, CustomField, Group, ProgressCategory, AppUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { getPerson, updatePerson, deletePerson } from '@/services/people-service';
import { getStaticGroups } from '@/services/groups-service';
import { generateDynamicGroups } from '@/lib/dynamic-groups';
import { createInitialProgress } from '@/lib/data';
import { FirebaseConfigError } from '@/components/firebase-config-error';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProgressTracker } from '@/components/progress-tracker';
import { Separator } from '@/components/ui/separator';
import { CallHistory } from '@/components/call-history';
import { GeneralRemarksCard } from '@/components/general-remarks-card';
import { Badge } from '@/components/ui/badge';
import { EditablePersonDetailsForm } from '@/components/editable-person-details-form';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

const PersonDetailPageComponent = React.memo(function PersonDetailPageComponent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const personId = params.id as string;
  const { appUser } = useAuth();

  const [person, setPerson] = React.useState<Person | null>(null);
  const [personGroups, setPersonGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  
  const canEditGoals = React.useMemo(() => {
    return appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  }, [appUser]);

  React.useEffect(() => {
    if (!personId || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };

    const fetchPersonAndGroups = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const personData = await getPerson(personId);
        
        if (!personData) {
          toast({ variant: 'destructive', title: 'Not Found', description: 'This person could not be found.' });
          router.push('/');
          return;
        }

        // Combine static and dynamic groups
        const staticGroups = await getStaticGroups(userInfo);
        const personStaticGroups = staticGroups.filter(g => g.peopleIds.includes(personData.id));

        const personDynamicGroups = generateDynamicGroups([personData])
          .filter(g => g.memberCount > 0);
        
        setPersonGroups([...personStaticGroups, ...personDynamicGroups].sort((a,b) => a.name.localeCompare(b.name)));

        if (!personData.progress || !Array.isArray(personData.progress) || personData.progress.length === 0 || !personData.progress[0]?.items) {
          personData.progress = createInitialProgress();
        }
        setPerson(personData);

      } catch (error) {
        console.error('Failed to load person data', error);
        if (error instanceof Error) setFetchError(error);
        else setFetchError(new Error("An unknown error occurred while fetching data."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonAndGroups();
  }, [personId, router, toast, appUser]);

  const handleSavePerson = async (formData: Partial<Person>) => {
    if (!person || !appUser) return;
    try {
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      await updatePerson(person.id, formData, userInfo);
      setPerson(prev => prev ? { ...prev, ...formData } : null);
      toast({ title: 'Person Updated', description: "The person's details have been saved." });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update person.' });
    }
  };

  const handleDeletePerson = async () => {
    if (!appUser) return;
    try {
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      await deletePerson(personId, userInfo);
      toast({
        title: 'Person Deleted',
        description: 'The person has been removed from your contacts.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete person.',
      });
    }
  };

  const handleProgressChange = React.useCallback(async (
    catIndex: number,
    itemIndex: number,
    levelIndex: number,
    value: string,
    field: 'achieved' | 'remark' | 'goal'
  ) => {
    if (!person || !appUser) return;

    const newProgress = JSON.parse(JSON.stringify(person.progress)) as ProgressCategory[];
    const targetItem = newProgress[catIndex]?.items?.[itemIndex];

    if (!targetItem) return;

    if (field === 'goal') {
      if (!canEditGoals) return;
      targetItem.levels[levelIndex] = value;
    } else if (field === 'achieved') {
      const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
      targetItem.answers[levelKey] = value;
    } else { // remark
      const remarkKey = `l${levelIndex + 1}_remark` as keyof ProgressLevelAnswers;
      targetItem.answers[remarkKey] = value;
    }
    
    const updatedPerson = { ...person, progress: newProgress };
    
    setPerson(updatedPerson); // Optimistic update
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };

    try {
      await updatePerson(personId, { progress: newProgress }, userInfo);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: 'Could not save progress changes.',
      });
      // Revert if API call fails
      setPerson(person); 
    }
  }, [person, personId, toast, canEditGoals, appUser]);
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (fetchError) {
      return (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <FirebaseConfigError error={fetchError} />
        </main>
      )
    }

    if (!person) {
      return (
        <div className="flex-1 flex items-center justify-center bg-background">
            Person not found.
        </div>
      );
    }
    
    return (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold leading-none">Contact Profile</h2>
                       </div>
                       <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                                <XCircle className="h-4 w-4 mr-2" />Cancel
                            </Button>
                                <Button size="sm" type="submit" form="person-details-form">
                                <Save className="h-4 w-4 mr-2" />Save
                            </Button>
                            </>
                        ) : (
                            <Button size="sm" onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />Edit
                            </Button>
                        )}
                       </div>
                    </CardHeader>
                    <CardContent>
                       <EditablePersonDetailsForm 
                          person={person} 
                          isEditing={isEditing} 
                          onSave={handleSavePerson}
                          onCancel={() => setIsEditing(false)}
                          allPeople={[]} // Not needed here as we are not creating
                          groups={personGroups}
                        />
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:w-2/3">
                  <ProgressTracker 
                    progress={person.progress}
                    onProgressChange={handleProgressChange}
                    isEditable={canEditGoals}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GeneralRemarksCard
                  personId={person.id}
                  initialRemarks={person.generalRemarks || ''}
                  personName={person.fullName}
                />
                <CallHistory person={person} />
              </div>
            </div>
          </main>
    );
  };
  

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          {person && !fetchError && (
              <PageHeader
                  title="Contact Details"
                  description={`Viewing profile for ${person.fullName || ''}`}
              >
                  <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      className="w-9 sm:w-auto"
                      onClick={() => router.back()}
                  >
                      <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
                      <span className="hidden sm:inline">Back</span>
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-9 sm:w-auto">
                          <Trash2 className="h-4 w-4 mr-0 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                      </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete{' '}
                          {person.fullName || 'this contact'}.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                          onClick={handleDeletePerson}
                          className="bg-destructive hover:bg-destructive/90"
                          >
                          Delete
                          </AlertDialogAction>
                      </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                  </div>
              </PageHeader>
          )}
          {renderContent()}
      </div>
    </div>
  );
});

export default function PersonDetailPage() {
  return (
    <PersonDetailPageComponent />
  )
}
