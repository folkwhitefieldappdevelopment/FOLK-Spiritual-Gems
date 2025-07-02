
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import type { Person, ProgressCategoryAnswers, ProgressLevelAnswers, CustomField } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/contexts/admin-context';
import { cn } from '@/lib/utils';
import { getPerson, updatePerson, deletePerson } from '@/services/people-service';
import { getCustomPersonFields } from '@/services/settings-service';
import { createInitialProgress } from '@/lib/data';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { ProgressTracker } from '@/components/progress-tracker';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Separator } from '@/components/ui/separator';

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const personId = params.id as string;
  const { isAdmin } = useAdmin();

  const [person, setPerson] = React.useState<Person | null>(null);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [configError, setConfigError] = React.useState(false);

  React.useEffect(() => {
    if (!personId) return;

    const fetchPerson = async () => {
      setIsLoading(true);
      try {
        const [personData, fieldsData] = await Promise.all([
            getPerson(personId),
            getCustomPersonFields(),
        ]);
        
        setCustomFields(fieldsData);

        if (personData) {
          if (!personData.progress || !Array.isArray(personData.progress) || personData.progress.length === 0 || !personData.progress[0]?.answers || !Array.isArray(personData.progress[0].answers)) {
            personData.progress = createInitialProgress();
          }
          setPerson(personData);
        } else {
          toast({
            variant: 'destructive',
            title: 'Not Found',
            description: 'This person could not be found.',
          });
          router.push('/');
        }
      } catch (error) {
        console.error('Failed to load person data', error);
         if (error instanceof Error && (error.message.includes('offline') || error.message.includes('permission-denied'))) {
          setConfigError(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load person data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerson();
  }, [personId, router, toast]);

  const handleSavePersonDialog = async (personData: Omit<Person, 'id' | 'progress'>) => {
    if (!person) return;
    try {
      const updatedPersonData = { ...person, ...personData };
      await updatePerson(personId, personData);
      setPerson(updatedPersonData);
      toast({
        title: 'Person Updated',
        description: "The person's details have been saved.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update person.',
      });
    }
  };

  const handleDeletePerson = async () => {
    try {
      await deletePerson(personId);
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

  const handleProgressChange = async (catIndex: number, itemIndex: number, levelIndex: number, value: string) => {
    if (!person) return;

    const newProgress = JSON.parse(JSON.stringify(person.progress));
    const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
    
    if (!newProgress[catIndex]) return;
    if (!newProgress[catIndex].answers) newProgress[catIndex].answers = [];
    if (!newProgress[catIndex].answers[itemIndex]) newProgress[catIndex].answers[itemIndex] = {l1:'', l2:'', l3:''};
    
    newProgress[catIndex].answers[itemIndex][levelKey] = value;
    
    const updatedPerson = { ...person, progress: newProgress };
    
    setPerson(updatedPerson); // Optimistic update

    try {
      await updatePerson(personId, { progress: newProgress });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: 'Could not save progress changes.',
      });
      // Revert if API call fails
      setPerson(person); 
    }
  };

  const formatCustomValue = (value: any, type: CustomField['type']) => {
    if (value === null || typeof value === 'undefined' || value === '') return 'N/A';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return 'Invalid Date';
      }
    }
    return String(value);
  }

  if (configError) {
    return <FirebaseConfigError />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col items-center justify-center bg-background">
          Loading contact details...
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col items-center justify-center bg-background">
          Person not found.
        </div>
      </div>
    );
  }

  const hasCustomData = customFields.some(field => person.customData && person.customData[field.id]);

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Contact Details"
            description={`Viewing profile for ${person.firstName} ${person.lastName}`}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete{' '}
                      {person.firstName} {person.lastName}.
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
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <div className={cn("grid grid-cols-1 gap-6", isAdmin && "lg:grid-cols-3")}>
                <div className={cn(isAdmin ? "lg:col-span-1" : "lg:col-span-3")}>
                  <Card>
                    <CardContent className="pt-6 text-center flex flex-col items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Avatar className="h-32 w-32 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                            <AvatarImage
                              src={person.photoUrl}
                              alt={`${person.firstName} ${person.lastName}`}
                              data-ai-hint="person portrait"
                            />
                            <AvatarFallback>
                              {person.firstName.charAt(0)}
                              {person.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </DialogTrigger>
                        <DialogContent className="p-0 border-0 max-w-lg bg-transparent shadow-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Profile photo for {person.firstName} {person.lastName}</DialogTitle>
                          </DialogHeader>
                          <img
                            src={person.photoUrl}
                            alt={`${person.firstName} ${person.lastName}`}
                            className="rounded-lg w-full h-auto object-contain"
                          />
                        </DialogContent>
                      </Dialog>
                      <h2 className="text-2xl font-bold">
                        {person.firstName} {person.lastName}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                          {person.sgRating || 'No rating'}
                      </p>

                      <div className="mt-6 w-full text-left grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <div className="font-semibold text-muted-foreground">Phone</div>
                          <div>{person.phone}</div>

                          <div className="font-semibold text-muted-foreground">Age</div>
                          <div>{person.age}</div>

                          <div className="font-semibold text-muted-foreground">Staying With</div>
                          <div>{person.stayingWith}</div>

                          <div className="font-semibold text-muted-foreground">Occupation</div>
                          <div>{person.occupation || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">Rent Details</div>
                          <div>{person.rentDetails || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">Native Place</div>
                          <div>{person.nativePlace || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">Contact Source</div>
                          <div>{person.contactSource || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">Chanting Status</div>
                          <div>{person.chantingStatus || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">From Other Camp</div>
                          <div>{person.fromOtherCamp ? 'Yes' : 'No'}</div>
                          
                          <div className="font-semibold text-muted-foreground">Enabler</div>
                          <div>{person.enablerInTouchWith || 'N/A'}</div>
                      </div>

                      {hasCustomData && (
                        <>
                          <Separator className="my-4" />
                          <div className="w-full text-left grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                             {customFields.map(field => {
                                const value = person.customData?.[field.id];
                                if (!value) return null;
                                return (
                                  <React.Fragment key={field.id}>
                                    <div className="font-semibold text-muted-foreground">{field.label}</div>
                                    <div>{formatCustomValue(value, field.type)}</div>
                                  </React.Fragment>
                                );
                             })}
                          </div>
                        </>
                      )}

                    </CardContent>
                  </Card>
                </div>
                {isAdmin && (
                  <div className="lg:col-span-2">
                    <ProgressTracker 
                      progress={person.progress}
                      onProgressChange={handleProgressChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <CreateUpdatePersonDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        onSave={(data) => handleSavePersonDialog(data)}
        person={person}
      />
    </>
  );
}
