'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Phone, Loader2 } from 'lucide-react';
import type { Person, ProgressCategoryAnswers, ProgressLevelAnswers, CustomField } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/contexts/admin-context';
import { cn } from '@/lib/utils';
import { getPerson, updatePerson, deletePerson } from '@/services/people-service';
import { getCustomPersonFields } from '@/services/settings-service';
import { createInitialProgress } from '@/lib/data';
import { AuthGuard } from '@/components/auth-guard';
import { FirebaseConfigError } from '@/components/firebase-config-error';

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
import { Separator } from '@/components/ui/separator';
import { CallHistory } from '@/components/call-history';

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const personId = params.id as string;
  const { isAdmin } = useAdmin();

  const [person, setPerson] = React.useState<Person | null>(null);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [allPeople, setAllPeople] = React.useState<Person[]>([]);

  React.useEffect(() => {
    if (!personId) return;

    const fetchPerson = async () => {
      setIsLoading(true);
      setFetchError(null);
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
        if (error instanceof Error) {
          setFetchError(error);
        } else {
          setFetchError(new Error("An unknown error occurred while fetching data."));
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

  const handleProgressChange = async (
    catIndex: number,
    itemIndex: number,
    levelIndex: number,
    value: string,
    field: 'achieved' | 'remark' = 'achieved'
  ) => {
    if (!person) return;

    const newProgress = JSON.parse(JSON.stringify(person.progress));
    
    if (!newProgress[catIndex]) return;
    if (!newProgress[catIndex].answers) newProgress[catIndex].answers = [];
    if (!newProgress[catIndex].answers[itemIndex]) newProgress[catIndex].answers[itemIndex] = {l1:'', l2:'', l3:'', l1_remark: '', l2_remark: '', l3_remark: ''};
    
    if (field === 'achieved') {
      const levelKey = `l${levelIndex + 1}` as keyof ProgressLevelAnswers;
      newProgress[catIndex].answers[itemIndex][levelKey] = value;
    } else { // remark
      const remarkKey = `l${levelIndex + 1}_remark` as keyof ProgressLevelAnswers;
      newProgress[catIndex].answers[itemIndex][remarkKey] = value;
    }
    
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

    const hasCustomData = customFields.some(field => person.customData && person.customData[field.id]);
    const fullName = person.fullName || '';
    const nameParts = fullName.split(' ');
    const fallback = nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}` 
      : fullName.substring(0, 2);

    return (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className={cn("flex flex-col lg:flex-row gap-6", !isAdmin && "lg:flex-col")}>
                <div className={cn(isAdmin ? "lg:w-1/3" : "w-full")}>
                  <Card>
                    <CardContent className="pt-6 text-center flex flex-col items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Avatar className="h-32 w-32 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                            <AvatarImage
                              src={person.photoUrl}
                              alt={fullName}
                              data-ai-hint="person portrait"
                            />
                            <AvatarFallback>
                              {fallback}
                            </AvatarFallback>
                          </Avatar>
                        </DialogTrigger>
                        <DialogContent className="p-0 border-0 max-w-lg bg-transparent shadow-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Profile photo for {fullName}</DialogTitle>
                          </DialogHeader>
                          <img
                            src={person.photoUrl}
                            alt={fullName}
                            className="rounded-lg w-full h-auto object-contain"
                          />
                        </DialogContent>
                      </Dialog>
                      <h2 className="text-2xl font-bold">
                        {fullName}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                          {person.sgRating ? `Rating: ${person.sgRating}/10` : 'No rating'}
                      </p>

                      <div className="mt-6 w-full text-left grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                          <div className="font-semibold text-muted-foreground">Phone</div>
                          <div className="flex items-center gap-x-3">
                            <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                              <Phone className="h-4 w-4" />
                              {person.phone}
                            </a>
                            <a href={`https://wa.me/91${person.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp chat">
                                <svg
                                    role="img"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 fill-current text-green-600 hover:opacity-80 transition-opacity"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                            </a>
                          </div>

                          <div className="font-semibold text-muted-foreground">Age</div>
                          <div>{person.age}</div>

                          <div className="font-semibold text-muted-foreground">Staying With</div>
                          <div>{person.stayingWith}</div>

                          <div className="font-semibold text-muted-foreground">Occupation Status</div>
                          <div>{person.occupation || 'N/A'}</div>

                          <div className="font-semibold text-muted-foreground">Organisation Name</div>
                          <div>{person.organisation || 'N/A'}</div>

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

                          <div className="font-semibold text-muted-foreground">Folk Guide</div>
                          <div>{person.folkGuide || 'N/A'}</div>
                      </div>

                      {hasCustomData && (
                        <>
                          <Separator className="my-4" />
                          <div className="w-full text-left grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                             {customFields.map(field => {
                                const value = person.customData?.[field.id];
                                if (!value) return null;
                                 if (field.type === 'textarea') {
                                  return (
                                    <React.Fragment key={field.id}>
                                      <div className="font-semibold text-muted-foreground col-span-2">{field.label}</div>
                                      <div className="col-span-2 whitespace-pre-wrap">{formatCustomValue(value, field.type)}</div>
                                    </React.Fragment>
                                  );
                                }
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
                  <div className="lg:w-2/3">
                    <ProgressTracker 
                      progress={person.progress}
                      onProgressChange={handleProgressChange}
                    />
                  </div>
                )}
              </div>
              <CallHistory person={person} />
            </div>
          </main>
    );
  };
  

  return (
    <AuthGuard>
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
                        onClick={() => router.push('/')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">Back</span>
                    </Button>
                    <Button size="sm" className="w-9 sm:w-auto" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
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
        <CreateUpdatePersonDialog
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onSave={(data) => handleSavePersonDialog(data)}
          person={person}
          allPeople={allPeople}
        />
      </div>
    </AuthGuard>
  );
}
