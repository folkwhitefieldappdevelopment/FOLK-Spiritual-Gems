
'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomField, CustomFieldType } from '@/lib/types';
import { customFieldTypes } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CustomFieldsManagerProps = {
    initialFields: CustomField[];
    onSave: (fields: CustomField[]) => Promise<void>;
};

export function CustomFieldsManager({ initialFields, onSave }: CustomFieldsManagerProps) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState(initialFields);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<CustomField | null>(null);
  
  const [fieldName, setFieldName] = React.useState('');
  const [fieldType, setFieldType] = React.useState<CustomFieldType>('text');
  const [fieldOptions, setFieldOptions] = React.useState('');
  
  const openDialog = (field: CustomField | null = null) => {
    setEditingField(field);
    setFieldName(field?.label || '');
    setFieldType(field?.type || 'text');
    setFieldOptions(field?.options?.join(', ') || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fieldName.trim()) {
      toast({ variant: 'destructive', title: 'Field Label cannot be empty.' });
      return;
    }
    
    let updatedFields: CustomField[];
    const optionsArray = fieldType === 'dropdown' ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    try {
      if (editingField) { // Edit mode
        updatedFields = fields.map(f => 
          f.id === editingField.id ? { ...f, label: fieldName.trim(), type: fieldType, options: optionsArray } : f
        );
      } else { // Add mode
        if (fields.some(f => f.label.toLowerCase() === fieldName.trim().toLowerCase())) {
          toast({ variant: 'destructive', title: 'A field with this label already exists.' });
          return;
        }
        const newField: CustomField = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          label: fieldName.trim(),
          type: fieldType,
          options: optionsArray,
        };
        updatedFields = [...fields, newField];
      }
        
      await onSave(updatedFields);
      setFields(updatedFields);
      toast({ title: editingField ? 'Custom Field Updated' : 'Custom Field Added' });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the custom field.' });
    }
  };

  const handleDelete = async (fieldId: string) => {
    try {
        const updatedFields = fields.filter(f => f.id !== fieldId);
        await onSave(updatedFields);
        setFields(updatedFields);
        toast({ title: 'Custom Field Deleted' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the custom field.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Custom Person Fields</CardTitle>
        <CardDescription>Add, edit, or remove custom fields for your contacts. The field type cannot be changed after creation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={() => openDialog()}>
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
              {fields.length > 0 ? (
                fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{field.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(field)}>
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
                            <AlertDialogAction onClick={() => handleDelete(field.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit' : 'Add'} Custom Field</DialogTitle>
            <DialogDescription>
              {editingField ? 'Update the details for this custom field.' : 'Define a new custom field for your contacts.'}
            </DialogDescription>
          </DialogHeader>
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
                disabled={!!editingField}
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
              {!!editingField && <p className="text-xs text-muted-foreground mt-1">Field type cannot be changed after creation.</p>}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
