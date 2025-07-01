
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import {
  getEnablers,
  getContactSources,
  addEnabler,
  addContactSource,
  updateEnabler,
  updateContactSource,
  deleteEnabler,
  deleteContactSource,
} from '@/services/settings-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DialogMode = 'add' | 'edit';
type ItemType = 'enabler' | 'source';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [configError, setConfigError] = React.useState(false);

  const [enablers, setEnablers] = React.useState<string[]>([]);
  const [sources, setSources] = React.useState<string[]>([]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>('add');
  const [itemType, setItemType] = React.useState<ItemType>('enabler');
  const [originalName, setOriginalName] = React.useState('');
  const [itemName, setItemName] = React.useState('');

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  React.useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      setConfigError(false);
      try {
        const [enablersData, sourcesData] = await Promise.all([
          getEnablers(),
          getContactSources(),
        ]);
        setEnablers(enablersData);
        setSources(sourcesData);
      } catch (error) {
        console.error('Failed to load settings data', error);
        if (error instanceof Error && error.message.includes('offline')) {
          setConfigError(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load settings data.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, user]);

  const openDialog = (mode: DialogMode, type: ItemType, name = '') => {
    setDialogMode(mode);
    setItemType(type);
    setOriginalName(name);
    setItemName(name);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      toast({ variant: 'destructive', title: 'Name cannot be empty.' });
      return;
    }

    try {
      if (itemType === 'enabler') {
        if (dialogMode === 'add') {
          const updated = await addEnabler(itemName);
          setEnablers(updated);
          toast({ title: 'Enabler Added' });
        } else {
          const updated = await updateEnabler(originalName, itemName);
          setEnablers(updated);
          toast({ title: 'Enabler Updated' });
        }
      } else {
        if (dialogMode === 'add') {
          const updated = await addContactSource(itemName);
          setSources(updated);
          toast({ title: 'Contact Source Added' });
        } else {
          const updated = await updateContactSource(originalName, itemName);
          setSources(updated);
          toast({ title: 'Contact Source Updated' });
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the item.' });
    }
  };

  const handleDelete = async (type: ItemType, name: string) => {
    try {
      if (type === 'enabler') {
        const updated = await deleteEnabler(name);
        setEnablers(updated);
        toast({ title: 'Enabler Deleted' });
      } else {
        const updated = await deleteContactSource(name);
        setSources(updated);
        toast({ title: 'Contact Source Deleted' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the item.' });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        Loading...
      </div>
    );
  }

  if (configError) {
    return <FirebaseConfigError />;
  }

  const renderList = (type: ItemType, items: string[]) => (
    <Card>
      <CardHeader>
        <CardTitle>{type === 'enabler' ? 'Manage Enablers' : 'Manage Contact Sources'}</CardTitle>
        <CardDescription>
          Add, edit, or remove the {type === 'enabler' ? 'enablers' : 'sources'} available in dropdowns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item}>
                    <TableCell className="font-medium">{item}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit', type, item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will remove "{item}" from the list and clear it from any contacts using it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(type, item)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                    No {type === 'enabler' ? 'enablers' : 'sources'} found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Settings"
            description="Manage options for dropdown menus across the application."
          />
          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <div className="text-center p-12">Loading settings...</div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-8">
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => openDialog('add', 'enabler')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Enabler
                        </Button>
                    </div>
                    {renderList('enabler', enablers)}
                </div>
                <div>
                     <div className="flex justify-end mb-4">
                        <Button onClick={() => openDialog('add', 'source')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Contact Source
                        </Button>
                    </div>
                    {renderList('source', sources)}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'edit' ? 'Edit' : 'Add'}{' '}
              {itemType === 'enabler' ? 'Enabler' : 'Contact Source'}
            </DialogTitle>
            <DialogDescription>
              Enter the name for the item below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="itemName">Name</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
