
'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { configError } from '@/lib/firebase';
import { FirebaseConfigError } from '@/components/firebase-config-error';

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
import {
  getEnablers,
  getContactSources,
  addEnabler,
  addContactSource,
  updateEnabler,
  updateContactSource,
  deleteEnabler,
  deleteContactSource,
  getCustomPersonFields,
  saveCustomPersonFields,
} from '@/services/settings-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomField, CustomFieldType } from '@/lib/types';
import { customFieldTypes } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DialogMode = 'add' | 'edit';
type ItemType = 'enabler' | 'source' | 'customField';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [firebaseError, setFirebaseError] = React.useState<Error | null>(null);

  const [enablers, setEnablers] = React.useState<string[]>([]);
  const [sources, setSources] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>('add');
  const [itemType, setItemType] = React.useState<ItemType>('enabler');
  
  // State for simple item dialog (enablers, sources)
  const [originalName, setOriginalName] = React.useState('');
  const [itemName, setItemName] = React.useState('');

  // State for custom field dialog
  const [editingField, setEditingField] = React.useState<CustomField | null>(null);
  const [fieldName, setFieldName] = React.useState('');
  const [fieldType, setFieldType] = React.useState<CustomFieldType>('text');

  React.useEffect(() => {
    if (configError) {
      setFirebaseError(configError);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [enablersData, sourcesData, customFieldsData] = await Promise.all([
          getEnablers(),
          getContactSources(),
          getCustomPersonFields(),
        ]);
        setEnablers(enablersData);
        setSources(sourcesData);
        setCustomFields(customFieldsData);
        setFirebaseError(null);
      } catch (error) {
        console.error('Failed to load settings data', error);
        if (error instanceof Error) {
            setFirebaseError(error);
        } else {
            setFirebaseError(new Error("An unknown error occurred during data fetching."));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const openDialog = (mode: DialogMode, type: ItemType, data: string | CustomField | null = null) => {
    setDialogMode(mode);
    setItemType(type);

    if (type === 'customField') {
        const field = data as CustomField | null;
        setEditingField(field);
        setFieldName(field ? field.label : '');
        setFieldType(field ? field.type : 'text');
    } else {
        const name = data as string | null;
        setOriginalName(name || '');
        setItemName(name || '');
    }
    
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const valueToSave = itemType === 'customField' ? fieldName : itemName;
    if (!valueToSave.trim()) {
      toast({ variant: 'destructive', title: 'Name/Label cannot be empty.' });
      return;
    }

    try {
      if (itemType === 'customField') {
        await handleSaveCustomField();
      } else if (itemType === 'enabler') {
        if (dialogMode === 'add') {
          const updated = await addEnabler(itemName);
          setEnablers(updated);
          toast({ title: 'Enabler Added' });
        } else {
          const updated = await updateEnabler(originalName, itemName);
          setEnablers(updated);
          toast({ title: 'Enabler Updated' });
        }
      } else { // source
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
  
  const handleSaveCustomField = async () => {
    let updatedFields: CustomField[];
    if (editingField) { // Edit mode
        updatedFields = customFields.map(f => 
            f.id === editingField.id ? { ...f, label: fieldName.trim() } : f
        );
    } else { // Add mode
        const newField: CustomField = {
            id: crypto.randomUUID(),
            label: fieldName.trim(),
            type: fieldType,
        };
        if (customFields.some(f => f.label.toLowerCase() === newField.label.toLowerCase())) {
            toast({ variant: 'destructive', title: 'A field with this label already exists.' });
            return;
        }
        updatedFields = [...customFields, newField];
    }
    await saveCustomPersonFields(updatedFields);
    setCustomFields(updatedFields);
    toast({ title: editingField ? 'Custom Field Updated' : 'Custom Field Added' });
  };

  const handleDelete = async (type: ItemType, identifier: string) => {
    try {
      if (type === 'enabler') {
        const updated = await deleteEnabler(identifier);
        setEnablers(updated);
        toast({ title: 'Enabler Deleted' });
      } else if (type === 'source') {
        const updated = await deleteContactSource(identifier);
        setSources(updated);
        toast({ title: 'Contact Source Deleted' });
      } else { // customField
        const updatedFields = customFields.filter(f => f.id !== identifier);
        await saveCustomPersonFields(updatedFields);
        setCustomFields(updatedFields);
        toast({ title: 'Custom Field Deleted' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the item.' });
    }
  };
  
  if (firebaseError) {
    return <FirebaseConfigError error={firebaseError} />;
  }

  const renderList = (type: 'enabler' | 'source', items: string[]) => (
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
  
  const renderCustomFieldsList = () => (
    <Card>
      <CardHeader>
        <CardTitle>Manage Custom Person Fields</CardTitle>
        <CardDescription>Add, edit, or remove custom fields for your contacts. The field type cannot be changed after creation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customFields.length > 0 ? (
                customFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{field.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit', 'customField', field)}>
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
                              This will permanently delete the "{field.label}" field. Any existing data for this field on your contacts will be kept but will no longer be visible or editable.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete('customField', field.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    No custom fields found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const getDialogTitle = () => {
    if (itemType === 'customField') {
      return `${dialogMode === 'edit' ? 'Edit' : 'Add'} Custom Field`;
    }
    return `${dialogMode === 'edit' ? 'Edit' : 'Add'} ${itemType === 'enabler' ? 'Enabler' : 'Contact Source'}`;
  }

  const renderDialogContent = () => {
    if (itemType === 'customField') {
      return (
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="fieldName">Field Label</Label>
            <Input
              id="fieldName"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fieldType">Field Type</Label>
            <Select
              value={fieldType}
              onValueChange={(value) => setFieldType(value as CustomFieldType)}
              disabled={dialogMode === 'edit'}
            >
              <SelectTrigger id="fieldType" className="mt-1">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {customFieldTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dialogMode === 'edit' && <p className="text-xs text-muted-foreground mt-1">Field type cannot be changed after creation.</p>}
          </div>
        </div>
      );
    } else {
      return (
        <div className="py-4">
          <Label htmlFor="itemName">Name</Label>
          <Input
            id="itemName"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="mt-1"
          />
        </div>
      )
    }
  }

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Settings"
            description="Manage options for dropdown menus and custom fields across the application."
          />
          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
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
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => openDialog('add', 'customField')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Field
                        </Button>
                    </div>
                    {renderCustomFieldsList()}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             <DialogDescription>
              {itemType === 'customField' 
                ? 'Define a new custom field for your contacts.'
                : 'Enter the name for the item below.'
              }
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
