
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import type { Person, ProgressCategoryAnswers } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { checklistData } from '@/lib/data';

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
import { CreateUpdatePersonDialog } from '@/components/create-update-person-dialog';
import { ProgressTracker } from '@/components/progress-tracker';

const createInitialProgress = (): ProgressCategoryAnswers[] => {
  return checklistData.map((category) => ({
    name: category.category as any,
    answers: category.items.map(() => ['', '', '']),
  }));
};

const migratePersonData = (person: any): Person => {
  if (person.nativePlace !== undefined) {
    return person as Person;
  }
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: person.phone || '',
    photoUrl: person.photoUrl || 'https://placehold.co/100x100.png',
    age: 25,
    stayingWith: 'Family',
    occupation: '',
    rentDetails: '',
    nativePlace: person.location || '',
    sgRating: person.status || 'N/A',
    contactSource: '',
    chantingStatus: 'N/A',
    fromOtherCamp: false,
    progress: (person.progress && Array.isArray(person.progress) && person.progress[0]?.answers) ? person.progress : createInitialProgress(),
  };
};

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const personId = params.id as string;

  const [people, setPeople] = React.useState<Person[]>([]);
  const [person, setPerson] = React.useState<Person | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedPeople = localStorage.getItem('people');
      if (storedPeople) {
        const parsedPeople = JSON.parse(storedPeople);
        const migratedPeople = parsedPeople.map(migratePersonData);
        setPeople(migratedPeople);
        const currentPerson = migratedPeople.find((p) => p.id === personId);
        setPerson(currentPerson || null);
      }
    } catch (error) {
      console.error('Failed to parse people from localStorage', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load person data.',
      });
    }
  }, [personId, toast]);

  const updatePeopleInStorage = (updatedPeople: Person[]) => {
    localStorage.setItem('people', JSON.stringify(updatedPeople));
    setPeople(updatedPeople);
  };
  
  const handlePersonUpdate = (updatedPerson: Person) => {
    setPerson(updatedPerson);
    const updatedPeople = people.map((p) =>
      p.id === personId ? updatedPerson : p
    );
    updatePeopleInStorage(updatedPeople);
  };

  const handleSavePersonDialog = (personData: Omit<Person, 'id' | 'progress'>) => {
    if (!person) return;
    const updatedPerson = { ...person, ...personData };
    handlePersonUpdate(updatedPerson);
    toast({
      title: 'Person Updated',
      description: "The person's details have been saved.",
    });
  };

  const handleDeletePerson = () => {
    const updatedPeople = people.filter((p) => p.id !== personId);
    updatePeopleInStorage(updatedPeople);
    toast({
      title: 'Person Deleted',
      description: 'The person has been removed from your contacts.',
    });
    router.push('/');
  };

  const handleProgressChange = (catIndex: number, itemIndex: number, levelIndex: number, value: string) => {
    if (!person) return;

    const newProgress = JSON.parse(JSON.stringify(person.progress));
    newProgress[catIndex].answers[itemIndex][levelIndex] = value;
    
    const updatedPerson = { ...person, progress: newProgress };
    
    setPerson(updatedPerson); 

    const updatedPeople = people.map((p) =>
      p.id === personId ? updatedPerson : p
    );
    updatePeopleInStorage(updatedPeople);
  };

  if (!person) {
    return (
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col items-center justify-center bg-background">
          Loading...
        </div>
      </div>
    );
  }

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
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <Card>
                    <CardContent className="pt-6 text-center flex flex-col items-center">
                      <Avatar className="h-32 w-32 mb-4">
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
                      </div>

                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-2">
                   <ProgressTracker 
                     progress={person.progress}
                     onProgressChange={handleProgressChange}
                   />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <CreateUpdatePersonDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        onSave={handleSavePersonDialog}
        person={person}
      />
    </>
  );
}
