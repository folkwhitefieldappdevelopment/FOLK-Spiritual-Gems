
'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useAuth } from '@/contexts/auth-context';

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
  getContactSources,
  addContactSource,
  updateContactSource,
  deleteContactSource,
  getCustomPersonFields,
  saveCustomPersonFields,
  getWhatsAppTemplate,
  saveWhatsAppTemplate,
  getOccupationStatuses,
  addOccupationStatus,
  updateOccupationStatus,
  deleteOccupationStatus,
  getStayingWithOptions,
  addStayingWithOption,
  updateStayingWithOption,
  deleteStayingWithOption,
} from '@/services/settings-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomField, CustomFieldType } from '@/lib/types';
import { customFieldTypes } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthGuard } from '@/components/auth-guard';
import { Textarea } from '@/components/ui/textarea';

type DialogMode = 'add' | 'edit';
type ItemType = 'source' | 'customField' | 'occupation' | 'stayingWith';

function WhatsAppTemplateCard({ initialTemplate, onSave }: { initialTemplate: string, onSave: (template: string) => Promise<void> }) {
  const [template, setTemplate] = React.useState(initialTemplate);
  const [isSaving, setIsSaving] = React.useState(false);
  const isDirty = template !== initialTemplate;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(template);
    setIsSaving(false);
  };

  return (
     <Card>
      <CardHeader>
        <CardTitle>WhatsApp Message Template</CardTitle>
        <CardDescription>
          Set a default message to pre-fill when clicking the WhatsApp icon. Use <code className="bg-muted px-1 py-0.5 rounded-sm">{'{name}'}</code> as a placeholder for the contact's name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="e.g., Hare Krishna {name}, ..."
          className="min-h-[120px]"
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsPageComponent() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);

  const [sources, setSources] = React.useState<string[]>([]);
  const [occupations, setOccupations] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [whatsAppTemplate, setWhatsAppTemplate] = React.useState('');
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>('add');
  const [itemType, setItemType] = React.useState<ItemType>('source');
  
  const [originalName, setOriginalName] = React.useState('');
  const [itemName, setItemName] = React.useState('');

  const [editingField, setEditingField] = React.useState<CustomField | null>(null);
  const [fieldName, setFieldName] = React.useState('');
  const [fieldType, setFieldType] = React.useState<CustomFieldType>('text');
  const [fieldOptions, setFieldOptions] = React.useState('');

  React.useEffect(() => {
    if (!appUser) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
        const [sourcesData, occupationsData, stayingData, customFieldsData, templateData] = await Promise.all([
          getContactSources(userInfo),
          getOccupationStatuses(userInfo),
          getStayingWithOptions(userInfo),
          getCustomPersonFields(userInfo),
          getWhatsAppTemplate(userInfo),
        ]);
        setSources(sourcesData);
        setOccupations(occupationsData);
        setStayingWithOptions(stayingData);
        setCustomFields(customFieldsData);
        setWhatsAppTemplate(templateData);
      } catch (error) {
        console.error('Failed to load settings data', error);
        if (error instanceof Error) {
            setFetchError(error);
        } else {
            setFetchError(new Error("An unknown error occurred while fetching data."));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appUser]);

  const openDialog = (mode: DialogMode, type: ItemType, data: string | CustomField | null = null) => {
    setDialogMode(mode);
    setItemType(type);

    if (type === 'customField') {
        const field = data as CustomField | null;
        setEditingField(field);
        setFieldName(field ? field.label : '');
        setFieldType(field ? field.type : 'text');
        setFieldOptions(field && field.options ? field.options.join(', ') : '');
    } else {
        const name = data as string | null;
        setOriginalName(name || '');
        setItemName(name || '');
    }
    
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!appUser) return;

    const valueToSave = itemType === 'customField' ? fieldName : itemName;
    if (!valueToSave.trim()) {
      toast({ variant: 'destructive', title: 'Name/Label cannot be empty.' });
      return;
    }

    try {
      const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      if (itemType === 'customField') {
        await handleSaveCustomField();
      } else if (itemType === 'source') {
        const updated = dialogMode === 'add' ? await addContactSource(itemName, userInfo) : await updateContactSource(originalName, itemName, userInfo);
        setSources(updated);
        toast({ title: `Contact Source ${dialogMode === 'add' ? 'Added' : 'Updated'}` });
      } else if (itemType === 'occupation') {
        const updated = dialogMode === 'add' ? await addOccupationStatus(itemName, userInfo) : await updateOccupationStatus(originalName, itemName, userInfo);
        setOccupations(updated);
        toast({ title: `Occupation Status ${dialogMode === 'add' ? 'Added' : 'Updated'}` });
      } else if (itemType === 'stayingWith') {
        const updated = dialogMode === 'add' ? await addStayingWithOption(itemName, userInfo) : await updateStayingWithOption(originalName, itemName, userInfo);
        setStayingWithOptions(updated);
        toast({ title: `'Staying With' Option ${dialogMode === 'add' ? 'Added' : 'Updated'}` });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the item.' });
    }
  };
  
  const handleSaveCustomField = async () => {
    if (!appUser) return;
    let updatedFields: CustomField[];
    const optionsArray = fieldType === 'dropdown' ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    
    if (editingField) { // Edit mode
        updatedFields = customFields.map(f => 
            f.id === editingField.id ? { ...f, label: fieldName.trim(), type: fieldType, options: optionsArray } : f
        );
    } else { // Add mode
        const newField: CustomField = {
            id: crypto.randomUUID(),
            label: fieldName.trim(),
            type: fieldType,
            options: optionsArray,
        };
        if (customFields.some(f => f.label.toLowerCase() === newField.label.toLowerCase())) {
            toast({ variant: 'destructive', title: 'A field with this label already exists.' });
            return;
        }
        updatedFields = [...customFields, newField];
    }
    const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    await saveCustomPersonFields(updatedFields, userInfo);
    setCustomFields(updatedFields);
    toast({ title: editingField ? 'Custom Field Updated' : 'Custom Field Added' });
    setIsDialogOpen(false);
  };

  const handleDelete = async (type: ItemType, identifier: string) => {
    if (!appUser) return;
    try {
      const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      if (type === 'source') {
        const updated = await deleteContactSource(identifier, userInfo);
        setSources(updated);
        toast({ title: 'Contact Source Deleted' });
      } else if (type === 'occupation') {
        const updated = await deleteOccupationStatus(identifier, userInfo);
        setOccupations(updated);
        toast({ title: 'Occupation Status Deleted' });
      } else if (type === 'stayingWith') {
        const updated = await deleteStayingWithOption(identifier, userInfo);
        setStayingWithOptions(updated);
        toast({ title: `'Staying With' Option Deleted` });
      } else { // customField
        const updatedFields = customFields.filter(f => f.id !== identifier);
        await saveCustomPersonFields(updatedFields, userInfo);
        setCustomFields(updatedFields);
        toast({ title: 'Custom Field Deleted' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the item.' });
    }
  };

  const handleSaveWhatsAppTemplate = async (template: string) => {
    if (!appUser) return;
    try {
        const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
        await saveWhatsAppTemplate(template, userInfo);
        setWhatsAppTemplate(template);
        toast({ title: 'WhatsApp Template Saved' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the template.' });
    }
  };
  
  const renderList = (type: ItemType, items: string[], title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={() => openDialog('add', type)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
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
                    No options found.
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
        <div className="flex justify-end mb-4">
            <Button onClick={() => openDialog('add', 'customField')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Field
            </Button>
        </div>
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
    if (itemType === 'customField') return `${dialogMode === 'edit' ? 'Edit' : 'Add'} Custom Field`;
    if (itemType === 'source') return `${dialogMode === 'edit' ? 'Edit' : 'Add'} Contact Source`;
    if (itemType === 'occupation') return `${dialogMode === 'edit' ? 'Edit' : 'Add'} Occupation Status`;
    if (itemType === 'stayingWith') return `${dialogMode === 'edit' ? 'Edit' : 'Add'} 'Staying With' Option`;
    return 'Edit Item';
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
          {fieldType === 'dropdown' && (
            <div>
              <Label htmlFor="fieldOptions">Dropdown Options</Label>
              <Input
                id="fieldOptions"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="e.g. Option A, Option B, Option C"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter comma-separated values for the dropdown.</p>
            </div>
          )}
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader
            title="Settings"
            description="Manage options for dropdown menus and custom fields across the application."
          />
          <main className="flex-1 p-4 sm:p-6 sm:pt-0">
            {isLoading ? (
              <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : fetchError ? (
                <FirebaseConfigError error={fetchError} />
            ) : (
              <div className="mx-auto max-w-4xl space-y-8">
                <WhatsAppTemplateCard initialTemplate={whatsAppTemplate} onSave={handleSaveWhatsAppTemplate} />
                {renderList('source', sources, 'Manage Contact Sources', 'Add, edit, or remove the sources available in dropdowns.')}
                {renderList('occupation', occupations, 'Manage Occupation Statuses', 'Add, edit, or remove the occupation statuses available in dropdowns.')}
                {renderList('stayingWith', stayingWithOptions, 'Manage "Staying With" Options', 'Add, edit, or remove the "Staying With" options available in dropdowns.')}
                {renderCustomFieldsList()}
              </div>
            )}
          </main>
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
    </div>
  );
}

export default function SettingsPage() {
    return (
        <AuthGuard adminOnly>
            <SettingsPageComponent />
        </AuthGuard>
    )
}
