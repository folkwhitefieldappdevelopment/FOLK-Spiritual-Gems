'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2, Save, BellRing, Database, CheckCircle2, RefreshCw, Fingerprint, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAppToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { updateUser, getUsers } from '@/services/user-service';
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

export default function SettingsPage() {
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBackfilling, setIsBackfilling] = React.useState(false);
  const [isBackfillingIds, setIsBackfillingIds] = React.useState(false);
  const isAdmin = appUser?.role.includes('Admin');

  const [sources, setSources] = React.useState<string[]>([]);
  const [occupations, setOccupations] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [folkStages, setFolkStages] = React.useState<FolkStage[]>([]);
  const [sgOptions, setSgOptions] = React.useState<string[]>([]);
  const [maOptions, setMaOptions] = React.useState<string[]>([]);
  const [frpOptions, setFrpOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [activityLabels, setActivityLabels] = React.useState<ActivityFieldLabels>({ sg: 'SG-S', ma: 'SG-W', frp: 'FRP'});
  const [isUpdatingLabels, setIsUpdatingLabels] = React.useState(false);
  
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [sourcesData, occupationsData, stayingData, customFieldsData, sgData, maData, frpData, labelsData, folkStagesData] = await Promise.all([
        getContactSources(), getOccupationStatuses(), getStayingWithOptions(), getCustomPersonFields(),
        getSgOptions(), getMaOptions(), getFrpOptions(), getActivityFieldLabels(), getCurrentFolkStages(),
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateLabels = async () => {
      setIsUpdatingLabels(true);
      try {
          await updateActivityFieldLabels(activityLabels, appUser || undefined);
          toast({ title: 'Labels Updated' });
      } finally {
          setIsUpdatingLabels(false);
      }
  };

  const handleBackfillDeleted = async () => {
    if (!appUser) return;
    setIsBackfilling(true);
    try {
      const count = await backfillIsDeleted({ id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ 
        title: 'Backfill Complete', 
        description: `Successfully patched ${count} legacy contact(s) with missing isDeleted fields.` 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Backfill Failed', description: 'Could not complete the data migration.' });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillEnablerIds = async () => {
    if (!appUser) return;
    setIsBackfillingIds(true);
    try {
      const allUsers = await getUsers(appUser);
      const count = await backfillEnablerId(allUsers, { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ 
        title: 'ID Linkage Complete', 
        description: `Successfully mapped Enabler IDs for ${count} contact(s).` 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Migration Failed' });
    } finally {
      setIsBackfillingIds(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage templates and application-wide options." />
      <main className="flex-1 p-4 sm:p-6 sm:pt-0 pb-20">
        {isLoading ? (
          <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            {isAdmin && <BroadcastNotificationCard />}
            <Card><CardHeader><CardTitle>Theme</CardTitle></CardHeader><CardContent><ThemeSwitcher /></CardContent></Card>
            
            {isAdmin && (
              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Database className="h-5 w-5" />
                    Data Maintenance
                  </CardTitle>
                  <CardDescription>Advanced tools to repair legacy data and improve Dashboard accuracy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-orange-500/10 bg-background space-y-3">
                       <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <h4 className="text-sm font-black uppercase tracking-tight">isDeleted Patch</h4>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          Legacy contacts created before soft-delete may be missing the <code className="bg-muted px-1 rounded">isDeleted</code> flag, causing them to be excluded from Dashboard counts.
                       </p>
                       <Button 
                          onClick={handleBackfillDeleted} 
                          disabled={isBackfilling}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-[10px] tracking-widest"
                       >
                          {isBackfilling ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                          Run Schema Fix
                       </Button>
                    </div>

                    <div className="p-4 rounded-xl border border-primary/10 bg-background space-y-3">
                       <div className="flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-black uppercase tracking-tight">Enabler ID Linkage</h4>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          Older records only contain Enabler names. This tool maps them to system IDs for accurate permission filtering.
                       </p>
                       <Button 
                          onClick={handleBackfillEnablerIds} 
                          disabled={isBackfillingIds}
                          variant="outline"
                          className="w-full border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest"
                       >
                          {isBackfillingIds ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Database className="mr-2 h-3 w-3" />}
                          Re-map IDs
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Calling Session Labels</CardTitle>
                  <CardDescription>Customize the display names for the quick-mark fields used during interaction logging.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="label-sg">SG-S Label</Label>
                      <Input id="label-sg" value={activityLabels.sg} onChange={e => setActivityLabels(p => ({...p, sg: e.target.value}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="label-ma">SG-W Label</Label>
                      <Input id="label-ma" value={activityLabels.ma} onChange={e => setActivityLabels(p => ({...p, ma: e.target.value}))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="label-frp">FRP Label</Label>
                      <Input id="label-frp" value={activityLabels.frp} onChange={e => setActivityLabels(p => ({...p, frp: e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleUpdateLabels} disabled={isUpdatingLabels}>
                        {isUpdatingLabels ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Apply Custom Labels
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Manage Dropdown Options</CardTitle></CardHeader>
              <CardContent className="space-y-10">
                <EditableOptionsList title="Contact Sources" items={sources} onAdd={async i => setSources(await addContactSource(i, appUser || undefined))} onUpdate={async (o, n) => setSources(await updateContactSource(o, n, appUser || undefined))} onDelete={async i => setSources(await deleteContactSource(i, appUser || undefined))} />
                <EditableOptionsList title="Current Folk Stage" items={folkStages} onAdd={async i => setFolkStages(await addCurrentFolkStage(i as FolkStage, appUser || undefined))} onUpdate={async (o, n) => setFolkStages(await updateCurrentFolkStage(o as FolkStage, n as FolkStage, appUser || undefined))} onDelete={async i => setFolkStages(await deleteCurrentFolkStage(i as FolkStage, appUser || undefined))} />
                <EditableOptionsList title="SG-S Marks (Quick Actions)" items={sgOptions} onAdd={async i => setSgOptions(await addSgOption(i, appUser || undefined))} onUpdate={async (o, n) => setSgOptions(await updateSgOption(o, n, appUser || undefined))} onDelete={async i => setSgOptions(await deleteSgOption(i, appUser || undefined))} />
                <EditableOptionsList title="SG-W Marks (Quick Actions)" items={maOptions} onAdd={async i => setMaOptions(await addMaOption(i, appUser || undefined))} onUpdate={async (o, n) => setMaOptions(await updateMaOption(o, n, appUser || undefined))} onDelete={async i => setMaOptions(await deleteMaOption(i, appUser || undefined))} />
                <EditableOptionsList title="FRP Marks (Quick Actions)" items={frpOptions} onAdd={async i => setFrpOptions(await addFrpOption(i, appUser || undefined))} onUpdate={async (o, n) => setFrpOptions(await updateFrpOption(o, n, appUser || undefined))} onDelete={async i => setFrpOptions(await deleteFrpOption(i, appUser || undefined))} />
              </CardContent>
            </Card>
            <CustomFieldsManager initialFields={customFields} onSave={async f => { await saveCustomPersonFields(f, appUser || undefined); setCustomFields(f); }} />
          </div>
        )}
      </main>
    </>
  );
}
