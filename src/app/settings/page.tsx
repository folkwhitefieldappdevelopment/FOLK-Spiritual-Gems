
'use client';

import * as React from 'react';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getEnablers,
  getContactSources,
  addEnabler,
  addContactSource,
  updateEnabler,
  updateContactSource,
  deleteEnabler,
  deleteContactSource
} from '@/services/settings-service';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { FirebaseConfigError } from '@/components/firebase-config-error';

export default function SettingsPage() {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [configError, setConfigError] = React.useState(false);

  // Enabler states
  const [enablers, setEnablers] = React.useState<string[]>([]);
  const [newEnabler, setNewEnabler] = React.useState('');
  const [editingEnablerIndex, setEditingEnablerIndex] = React.useState<number | null>(null);
  const [editingEnablerValue, setEditingEnablerValue] = React.useState('');

  // Contact Source states
  const [contactSources, setContactSources] = React.useState<string[]>([]);
  const [newContactSource, setNewContactSource] = React.useState('');
  const [editingSourceIndex, setEditingSourceIndex] = React.useState<number | null>(null);
  const [editingSourceValue, setEditingSourceValue] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [enablersData, sourcesData] = await Promise.all([
          getEnablers(),
          getContactSources(),
        ]);
        setEnablers(enablersData);
        setContactSources(sourcesData);
      } catch (error) {
        console.error('Failed to load settings from Firebase', error);
        if (error instanceof Error && error.message.includes('offline')) {
          setConfigError(true);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load settings.'});
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  // Enabler functions
  const handleAddEnabler = async () => {
    if (newEnabler.trim() && !enablers.includes(newEnabler.trim())) {
      try {
        const updatedEnablers = await addEnabler(newEnabler.trim());
        setEnablers(updatedEnablers);
        setNewEnabler('');
        toast({ title: 'Enabler Added' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add enabler.' });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Enabler name cannot be empty or a duplicate.',
      });
    }
  };

  const handleDeleteEnabler = async (enablerToDelete: string) => {
    try {
      const updatedEnablers = await deleteEnabler(enablerToDelete);
      setEnablers(updatedEnablers);
      toast({ title: 'Enabler Deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete enabler.' });
    }
  };

  const handleStartEditEnabler = (index: number) => {
    setEditingEnablerIndex(index);
    setEditingEnablerValue(enablers[index]);
  };

  const handleCancelEditEnabler = () => {
    setEditingEnablerIndex(null);
    setEditingEnablerValue('');
  }

  const handleSaveEditEnabler = async (index: number) => {
    if (editingEnablerValue.trim() && !enablers.some((e, i) => e === editingEnablerValue.trim() && i !== index)) {
      const oldEnablerName = enablers[index];
      try {
        const updatedEnablers = await updateEnabler(oldEnablerName, editingEnablerValue.trim());
        setEnablers(updatedEnablers);
        handleCancelEditEnabler();
        toast({ title: 'Enabler Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update enabler.' });
      }
    } else {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Enabler name cannot be empty or a duplicate.',
      });
    }
  };

  // Contact Source functions
  const handleAddContactSource = async () => {
    if (newContactSource.trim() && !contactSources.includes(newContactSource.trim())) {
      try {
        const updatedSources = await addContactSource(newContactSource.trim());
        setContactSources(updatedSources);
        setNewContactSource('');
        toast({ title: 'Contact Source Added' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add contact source.' });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Contact source name cannot be empty or a duplicate.',
      });
    }
  };

  const handleDeleteContactSource = async (sourceToDelete: string) => {
    try {
      const updatedSources = await deleteContactSource(sourceToDelete);
      setContactSources(updatedSources);
      toast({ title: 'Contact Source Deleted' });
    } catch(error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete contact source.' });
    }
  };
  
  const handleStartEditSource = (index: number) => {
    setEditingSourceIndex(index);
    setEditingSourceValue(contactSources[index]);
  };
  
  const handleCancelEditSource = () => {
    setEditingSourceIndex(null);
    setEditingSourceValue('');
  };
  
  const handleSaveEditSource = async (index: number) => {
    if (editingSourceValue.trim() && !contactSources.some((s, i) => s === editingSourceValue.trim() && i !== index)) {
      const oldSourceName = contactSources[index];
      try {
        const updatedSources = await updateContactSource(oldSourceName, editingSourceValue.trim());
        setContactSources(updatedSources);
        handleCancelEditSource();
        toast({ title: 'Contact Source Updated' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update contact source.' });
      }
    } else {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Contact source name cannot be empty or a duplicate.',
      });
    }
  };
  
  if (configError) {
    return <FirebaseConfigError />;
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-12">Loading settings...</div>;
    }

    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Manage Enablers</CardTitle>
            <CardDescription>
              Add, edit, or delete enablers. These are available in the dropdown when editing a contact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newEnabler}
                  onChange={(e) => setNewEnabler(e.target.value)}
                  placeholder="Enter new enabler name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEnabler()}
                />
                <Button onClick={handleAddEnabler}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-2">
                {enablers.length > 0 ? (
                  enablers.map((enabler, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/50">
                      {editingEnablerIndex === index ? (
                        <>
                          <Input 
                            value={editingEnablerValue}
                            onChange={(e) => setEditingEnablerValue(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditEnabler(index)}
                          />
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEditEnabler(index)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditEnabler}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{enabler}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEditEnabler(index)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the enabler '{enabler}'. Any contacts assigned to this enabler will have the field cleared. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEnabler(enabler)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground p-4">No enablers found. Add one to get started.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Contact Sources</CardTitle>
            <CardDescription>
              Add, edit, or delete contact sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newContactSource}
                  onChange={(e) => setNewContactSource(e.target.value)}
                  placeholder="Enter new contact source"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContactSource()}
                />
                <Button onClick={handleAddContactSource}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-2">
                {contactSources.length > 0 ? (
                  contactSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/50">
                      {editingSourceIndex === index ? (
                        <>
                          <Input 
                            value={editingSourceValue}
                            onChange={(e) => setEditingSourceValue(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditSource(index)}
                          />
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEditSource(index)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditSource}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{source}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEditSource(index)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the source '{source}'. Any contacts using this source will have the field cleared. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteContactSource(source)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground p-4">No contact sources found. Add one to get started.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col bg-background">
        <PageHeader
          title="Settings"
          description="Manage application settings."
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
