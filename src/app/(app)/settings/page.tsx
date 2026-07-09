'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, Loader2, Save, BellRing, Database, CheckCircle2, RefreshCw, Fingerprint } from 'lucide-react';
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
  const isAdmin = appUser?.role.includes('Admin');

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

  return (
    <>
      <PageHeader title="Settings" description="Manage templates and application-wide options." />
      <main className="flex-1 p-4 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="flex min-h-[50vh] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            {isAdmin && <BroadcastNotificationCard />}
            <Card><CardHeader><CardTitle>Theme</CardTitle></CardHeader><CardContent><ThemeSwitcher /></CardContent></Card>
            <Card><CardHeader><CardTitle>Manage Dropdown Options</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <EditableOptionsList title="Contact Sources" items={sources} onAdd={async i => setSources(await addContactSource(i, appUser || undefined))} onUpdate={async (o, n) => setSources(await updateContactSource(o, n, appUser || undefined))} onDelete={async i => setSources(await deleteContactSource(i, appUser || undefined))} />
                <EditableOptionsList title="Current Folk Stage" items={folkStages} onAdd={async i => setFolkStages(await addCurrentFolkStage(i as FolkStage, appUser || undefined))} onUpdate={async (o, n) => setFolkStages(await updateCurrentFolkStage(o as FolkStage, n as FolkStage, appUser || undefined))} onDelete={async i => setFolkStages(await deleteCurrentFolkStage(i as FolkStage, appUser || undefined))} />
              </CardContent>
            </Card>
            <CustomFieldsManager initialFields={customFields} onSave={async f => { await saveCustomPersonFields(f, appUser || undefined); setCustomFields(f); }} />
          </div>
        )}
      </main>
    </>
  );
}
