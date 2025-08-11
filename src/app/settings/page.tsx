
'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseConfigError } from '@/components/firebase-config-error';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { CustomField } from '@/lib/types';
import { EditableOptionsList } from '@/components/editable-options-list';
import { CustomFieldsManager } from '@/components/custom-fields-manager';

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
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="e.g., Hare Krishna {name}, ..."
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);

  const [sources, setSources] = React.useState<string[]>([]);
  const [occupations, setOccupations] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [whatsAppTemplate, setWhatsAppTemplate] = React.useState('');
  
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [sourcesData, occupationsData, stayingData, customFieldsData, templateData] = await Promise.all([
          getContactSources(),
          getOccupationStatuses(),
          getStayingWithOptions(),
          getCustomPersonFields(),
          getWhatsAppTemplate(),
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
  }, []);

  const handleSaveWhatsAppTemplate = async (template: string) => {
    try {
        await saveWhatsAppTemplate(template);
        setWhatsAppTemplate(template);
        toast({ title: 'WhatsApp Template Saved' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the template.' });
    }
  };

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
                
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Dropdown Options</CardTitle>
                        <CardDescription>Add, edit, or remove the options available in dropdown menus across the app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <EditableOptionsList
                            title="Contact Sources"
                            items={sources}
                            onAdd={async (item) => setSources(await addContactSource(item))}
                            onUpdate={async (old, item) => setSources(await updateContactSource(old, item))}
                            onDelete={async (item) => setSources(await deleteContactSource(item))}
                        />
                         <EditableOptionsList
                            title="Occupation Statuses"
                            items={occupations}
                            onAdd={async (item) => setOccupations(await addOccupationStatus(item))}
                            onUpdate={async (old, item) => setOccupations(await updateOccupationStatus(old, item))}
                            onDelete={async (item) => setOccupations(await deleteOccupationStatus(item))}
                        />
                         <EditableOptionsList
                            title="'Staying With' Options"
                            items={stayingWithOptions}
                            onAdd={async (item) => setStayingWithOptions(await addStayingWithOption(item))}
                            onUpdate={async (old, item) => setStayingWithOptions(await updateStayingWithOption(old, item))}
                            onDelete={async (item) => setStayingWithOptions(await deleteStayingWithOption(item))}
                        />
                    </CardContent>
                </Card>

                <CustomFieldsManager 
                    initialFields={customFields}
                    onSave={async (fields) => {
                      await saveCustomPersonFields(fields);
                      setCustomFields(fields);
                    }}
                />

              </div>
            )}
          </main>
        </div>
    </div>
  );
}
