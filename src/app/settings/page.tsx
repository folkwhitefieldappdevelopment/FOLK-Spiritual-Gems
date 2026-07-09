'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2, Save, BellRing, Database, CheckCircle2, RefreshCw, Fingerprint } from 'lucide-react';
import { useAppToast } from '@/contexts/toast-context';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useAuth } from '@/contexts/auth-context';
import { updateUser, getUsers } from '@/services/user-service';

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
  getOccupationStatuses,
  addOccupationStatus,
  updateOccupationStatus,
  deleteOccupationStatus,
  getStayingWithOptions,
  addStayingWithOption,
  updateStayingWithOption,
  deleteStayingWithOption,
  getSgOptions,
  addSgOption,
  updateSgOption,
  deleteSgOption,
  getMaOptions,
  addMaOption,
  updateMaOption,
  deleteMaOption,
  getFrpOptions,
  addFrpOption,
  updateFrpOption,
  deleteFrpOption,
  getActivityFieldLabels,
  updateActivityFieldLabels,
  getCurrentFolkStages,
  addCurrentFolkStage,
  updateCurrentFolkStage,
  deleteCurrentFolkStage,
} from '@/services/settings-service';
import { backfillIsDeleted, backfillEnablerId } from '@/services/people-service';
import type { CustomField, ActivityFieldLabels, FolkStage } from '@/lib/types';
import { EditableOptionsList } from '@/components/editable-options-list';
import { CustomFieldsManager } from '@/components/custom-fields-manager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { BroadcastNotificationCard } from '@/components/broadcast-notification-card';

const DEFAULT_WHATSAPP_TEMPLATE = "Hare Krishna {name}, we are inviting you for our upcoming spiritual session. Hope to see you there!";

function WhatsAppTemplateCard({ initialTemplate, onSave }: { initialTemplate: string, onSave: (template: string) => Promise<void> }) {
  const [template, setTemplate] = React.useState(initialTemplate);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setTemplate(initialTemplate);
  }, [initialTemplate]);

  const isDirty = template !== initialTemplate;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(template);
    setIsSaving(false);
  };

  return (
     <Card>
      <CardHeader>
        <CardTitle>Personal WhatsApp Message Template</CardTitle>
        <CardDescription>
          Set your own default message to pre-fill when clicking the WhatsApp icon. Use <code className="bg-muted px-1 py-0.5 rounded-sm">{'{name}'}</code> as a placeholder for the contact's name.
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
            Save My Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityFieldNamesCard({ initialLabels, onSave }: { initialLabels: ActivityFieldLabels, onSave: (labels: ActivityFieldLabels) => Promise<void> }) {
    const [labels, setLabels] = React.useState(initialLabels);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const isDirty = JSON.stringify(labels) !== JSON.stringify(initialLabels);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(labels);
        setIsSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Calling Session Field Names</CardTitle>
                <CardDescription>Customize the labels for the activity fields shown in the calling session dialog.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="sg-label">Label 1</Label>
                        <Input id="sg-label" value={labels.sg} onChange={e => setLabels(prev => ({...prev, sg: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ma-label">Label 2</Label>
                        <Input id="ma-label" value={labels.ma} onChange={e => setLabels(prev => ({...prev, ma: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="frp-label">Label 3</Label>
                        <Input id="frp-label" value={labels.frp} onChange={e => setLabels(prev => ({...prev, frp: e.target.value}))} />
                    </div>
                </div>
                 <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Labels
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [isBackfilling, setIsBackfilling] = React.useState(false);
  const [isIDBackfilling, setIsIDBackfilling] = React.useState(false);

  const [sources, setSources] = React.useState<string[]>([]);
  const [occupations, setOccupations] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [folkStages, setFolkStages] = React.useState<FolkStage[]>([]);
  const [sgOptions, setSgOptions] = React.useState<string[]>([]);
  const [maOptions, setMaOptions] = React.useState<string[]>([]);
  const [frpOptions, setFrpOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [activityLabels, setActivityLabels] = React.useState<ActivityFieldLabels>({ sg: 'SG', ma: 'MA', frp: 'FRP'});
  
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [sourcesData, occupationsData, stayingData, customFieldsData, sgData, maData, frpData, labelsData, folkStagesData] = await Promise.all([
        getContactSources(),
        getOccupationStatuses(),
        getStayingWithOptions(),
        getCustomPersonFields(),
        getSgOptions(),
        getMaOptions(),
        getFrpOptions(),
        getActivityFieldLabels(),
        getCurrentFolkStages(),
      ]);
      setSources(sourcesData);
      setOccupations(occupationsData);
      setStayingWithOptions(stayingData);
      setCustomFields(customFieldsData);
      setSgOptions(sgData);
      setMaOptions(maData);
      setFrpOptions(frpData);
      setActivityLabels(labelsData);
      setFolkStages(folkStagesData as FolkStage[]);
    } catch (error) {
      if (error instanceof Error) {
          setFetchError(error);
      } else {
          setFetchError(new Error("An unknown error occurred while fetching data."));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveWhatsAppTemplate = async (template: string) => {
    if (!appUser) return;
    try {
        await updateUser(appUser.id, { whatsAppTemplate: template });
        setAppUser(prev => prev ? { ...prev, whatsAppTemplate: template } : null);
        toast({ title: 'WhatsApp Template Saved' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your template.' });
    }
  };
  
  const handleSaveActivityLabels = async (labels: ActivityFieldLabels) => {
    try {
        await updateActivityFieldLabels(labels, appUser || undefined);
        setActivityLabels(labels);
        toast({ title: 'Activity Labels Saved' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the labels.' });
    }
  }

  const handleBackfill = async () => {
    if (!appUser) return;
    setIsBackfilling(true);
    try {
      const count = await backfillIsDeleted(appUser);
      toast({ 
        title: 'Maintenance Complete', 
        description: `Successfully updated ${count} contacts. All contacts should now be visible in lists.` 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Maintenance Failed' });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleEnablerIDBackfill = async () => {
    if (!appUser) return;
    setIsIDBackfilling(true);
    try {
      const allUsers = await getUsers(appUser);
      const count = await backfillEnablerId(allUsers, appUser);
      toast({ 
        title: 'ID Sync Complete', 
        description: `Linked ${count} contacts to their respective Enabler IDs. This fixes "My Contacts" visibility.` 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'ID Sync Failed' });
    } finally {
      setIsIDBackfilling(false);
    }
  };

  const handleTriggerTestAlarm = () => {
    toast({ title: "Testing Alarm", description: "The alarm will trigger in 3 seconds..." });
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-test-alarm'));
    }, 3000);
  }

  const isAdmin = appUser?.role.includes('Admin');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader
            title="Settings"
            description="Manage your personal templates and application-wide options."
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
                {isAdmin && <BroadcastNotificationCard />}

                {isAdmin && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            System Maintenance
                        </CardTitle>
                        <CardDescription>Essential tools for fixing database inconsistencies in older records.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background border rounded-xl">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm">Restore Missing Contacts (Backfill)</h4>
                                <p className="text-xs text-muted-foreground max-w-md">If some contacts aren't appearing in your "Mine" or "All" lists, they likely lack a system flag. Run this once to fix all records.</p>
                            </div>
                            <Button onClick={handleBackfill} disabled={isBackfilling} variant="outline" className="shrink-0 font-bold">
                                {isBackfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Fix Visibility
                            </Button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background border rounded-xl">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm">Sync Enabler Assignment IDs</h4>
                                <p className="text-xs text-muted-foreground max-w-md">Fixes "My Contacts" being empty by linking legacy name-based assignments to unique User IDs.</p>
                            </div>
                            <Button onClick={handleEnablerIDBackfill} disabled={isIDBackfilling} variant="outline" className="shrink-0 font-bold">
                                {isIDBackfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                                Sync IDs
                            </Button>
                        </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-accent/50 bg-accent/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-accent" />
                            Reminder & Alarm Test
                        </CardTitle>
                        <CardDescription>Verify that your browser allows sound and notifications for this app.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handleTriggerTestAlarm}>
                            Test Alarm System
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Theme</CardTitle>
                        <CardDescription>Choose how you want the application to look.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ThemeSwitcher />
                    </CardContent>
                </Card>
                
                <WhatsAppTemplateCard 
                    initialTemplate={appUser?.whatsAppTemplate || DEFAULT_WHATSAPP_TEMPLATE} 
                    onSave={handleSaveWhatsAppTemplate} 
                />
                
                <ActivityFieldNamesCard initialLabels={activityLabels} onSave={handleSaveActivityLabels} />

                <Card>
                    <CardHeader>
                        <CardTitle>Manage Dropdown Options</CardTitle>
                        <CardDescription>Add, edit, or remove the options available in dropdown menus across the app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <EditableOptionsList
                            title="Contact Sources"
                            items={sources}
                            onAdd={async (item) => setSources(await addContactSource(item, appUser || undefined))}
                            onUpdate={async (old, item) => setSources(await updateContactSource(old, item, appUser || undefined))}
                            onDelete={async (item) => setSources(await deleteContactSource(item, appUser || undefined))}
                        />
                         <EditableOptionsList
                            title="Occupation Statuses"
                            items={occupations}
                            onAdd={async (item) => setOccupations(await addOccupationStatus(item, appUser || undefined))}
                            onUpdate={async (old, item) => setOccupations(await updateOccupationStatus(old, item, appUser || undefined))}
                            onDelete={async (item) => setOccupations(await deleteOccupationStatus(item, appUser || undefined))}
                        />
                         <EditableOptionsList
                            title="'Staying With' Options"
                            items={stayingWithOptions}
                            onAdd={async (item) => setStayingWithOptions(await addStayingWithOption(item, appUser || undefined))}
                            onUpdate={async (old, item) => setStayingWithOptions(await updateStayingWithOption(old, item, appUser || undefined))}
                            onDelete={async (item) => setStayingWithOptions(await deleteStayingWithOption(item, appUser || undefined))}
                        />
                        <EditableOptionsList
                            title="Current Folk Stage"
                            items={folkStages}
                            onAdd={async (item) => setFolkStages(await addCurrentFolkStage(item as FolkStage, appUser || undefined))}
                            onUpdate={async (old, item) => setFolkStages(await updateCurrentFolkStage(old as FolkStage, item as FolkStage, appUser || undefined))}
                            onDelete={async (item) => setFolkStages(await deleteCurrentFolkStage(item as FolkStage, appUser || undefined))}
                        />
                        <EditableOptionsList
                            title={`${activityLabels.sg} Options (Calling Session)`}
                            items={sgOptions}
                            onAdd={async (item) => setSgOptions(await addSgOption(item, appUser || undefined))}
                            onUpdate={async (old, item) => setSgOptions(await updateSgOption(old, item, appUser || undefined))}
                            onDelete={async (item) => setSgOptions(await deleteSgOption(item, appUser || undefined))}
                        />
                        <EditableOptionsList
                            title={`${activityLabels.ma} Options (Calling Session)`}
                            items={maOptions}
                            onAdd={async (item) => setMaOptions(await addMaOption(item, appUser || undefined))}
                            onUpdate={async (old, item) => setMaOptions(await updateMaOption(old, item, appUser || undefined))}
                            onDelete={async (item) => setMaOptions(await deleteMaOption(item, appUser || undefined))}
                        />
                        <EditableOptionsList
                            title={`${activityLabels.frp} Options (Calling Session)`}
                            items={frpOptions}
                            onAdd={async (item) => setFrpOptions(await addFrpOption(item, appUser || undefined))}
                            onUpdate={async (old, item) => setFrpOptions(await updateFrpOption(old, item, appUser || undefined))}
                            onDelete={async (item) => setFrpOptions(await deleteFrpOption(item, appUser || undefined))}
                        />
                    </CardContent>
                </Card>

                <CustomFieldsManager 
                    initialFields={customFields}
                    onSave={async (fields) => {
                      await saveCustomPersonFields(fields, appUser || undefined);
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
