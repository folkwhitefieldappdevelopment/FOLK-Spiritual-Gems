'use client';

import * as React from 'react';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  Save, 
  BellRing, 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  Fingerprint, 
  ShieldAlert, 
  AlertTriangle,
  Bell,
  Smartphone,
  Info,
  UserPlus,
  Mail,
  MessageSquare,
  Layers,
  MessageCircle,
  Pencil,
  Plus
} from 'lucide-react';
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
  getExternalCoEnablers,
  addExternalCoEnabler,
  deleteExternalCoEnabler,
  getGoalCategories,
  addGoalCategory,
  updateGoalCategory,
  deleteGoalCategory,
  getWhatsappReportTemplate,
  updateWhatsappReportTemplate,
} from '@/services/settings-service';
import { backfillIsDeleted, backfillEnablerId } from '@/services/people-service';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendNotification 
} from '@/lib/notification-service';
import type { CustomField, ActivityFieldLabels, FolkStage, ExternalCoEnabler } from '@/lib/types';
import { EditableOptionsList } from '@/components/editable-options-list';
import { CustomFieldsManager } from '@/components/custom-fields-manager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { BroadcastNotificationCard } from '@/components/broadcast-notification-card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Capacitor } from '@capacitor/core';
import { CallLog } from '@/lib/call-log';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
     <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
      <CardHeader className="bg-card border-b border-border p-8 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
          <MessageSquare className="h-6 w-6 text-primary" />
          Personal WhatsApp Template
        </CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Set your own default message for one-on-one outreach. Use <code className="bg-muted px-1 py-0.5 rounded-sm">{'{name}'}</code> as a placeholder for the contact's name.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-4">
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="e.g., Hare Krishna {name}, ..."
          className="w-full min-h-[120px] rounded-2xl border-border bg-muted text-foreground font-bold p-5"
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !isDirty} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px]">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save My Template
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
  const [isBackfilling, setIsBackfilling] = React.useState(false);
  const [isBackfillingIds, setIsBackfillingIds] = React.useState(false);
  const isAdmin = appUser?.role.includes('Admin');
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const [sources, setSources] = React.useState<string[]>([]);
  const [occupations, setOccupations] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [folkStages, setFolkStages] = React.useState<FolkStage[]>([]);
  const [goalCategories, setGoalCategories] = React.useState<string[]>([]);
  const [sgOptions, setSgOptions] = React.useState<string[]>([]);
  const [maOptions, setMaOptions] = React.useState<string[]>([]);
  const [frpOptions, setFrpOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [activityLabels, setActivityLabels] = React.useState<ActivityFieldLabels>({ sg: 'SG-S', ma: 'SG-W', frp: 'FRP'});
  const [isUpdatingLabels, setIsUpdatingLabels] = React.useState(false);
  
  const [whatsappTemplate, setWhatsappTemplate] = React.useState('');
  const [isUpdatingWhatsappTemplate, setIsUpdatingWhatsappTemplate] = React.useState(false);

  const [externalCoEnablers, setExternalCoEnablers] = React.useState<ExternalCoEnabler[]>([]);
  const [isExternalDialogOpen, setIsExternalDialogOpen] = React.useState(false);
  const [newExternal, setNewExternal] = React.useState({ name: '', email: '' });
  const [isAddingExternal, setIsAddingExternal] = React.useState(false);

  const [notifStatus, setNotifStatus] = React.useState<string>('default');
  const [overlayStatus, setOverlayStatus] = React.useState<'granted' | 'denied' | 'checking'>('checking');
  const [isPreviewingOverlay, setIsPreviewingOverlay] = React.useState(false);

  const refreshOverlayStatus = React.useCallback(async () => {
      if (!Capacitor.isNativePlatform()) return;
      setOverlayStatus('checking');
      const perms = await CallLog.checkPermissions();
      setOverlayStatus(perms.overlay === 'granted' ? 'granted' : 'denied');
  }, []);

  const handlePreviewOverlay = async () => {
    setIsPreviewingOverlay(true);
    try {
        const result = await CallLog.showNativeOverlay({
            name: 'Sample Contact',
            phone: '+91 98765 43210',
            photoUrl: '',
            stage: 'Fresh Lead',
            remark: 'This is a preview of the caller ID overlay.',
            type: 'INCOMING'
        });

        if (result && (result as any).shown === false) {
            toast({
                variant: 'destructive',
                title: "Preview blocked",
                description: "'Display over other apps' isn't granted, so the overlay couldn't be shown. Tap Enable above and try again."
            });
            setIsPreviewingOverlay(false);
            return;
        }

        toast({ title: "Preview shown", description: "Check your screen — the sample overlay will auto-hide in 5 seconds." });
        setTimeout(async () => {
            await CallLog.hideNativeOverlay();
            setIsPreviewingOverlay(false);
        }, 5000);
    } catch (e) {
        setIsPreviewingOverlay(false);
        toast({ variant: 'destructive', title: "Preview failed", description: "Could not trigger the overlay." });
    }
  };

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [sourcesData, occupationsData, stayingData, customFieldsData, sgData, maData, frpData, labelsData, folkStagesData, externalData, goalCatsData, waTemplate] = await Promise.all([
        getContactSources(), getOccupationStatuses(), getStayingWithOptions(), getCustomPersonFields(),
        getSgOptions(), getMaOptions(), getFrpOptions(), getActivityFieldLabels(), getCurrentFolkStages(),
        getExternalCoEnablers(), getGoalCategories(), getWhatsappReportTemplate()
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
      setExternalCoEnablers(externalData);
      setGoalCategories(goalCatsData);
      setWhatsappTemplate(waTemplate);
      setNotifStatus(getNotificationPermission());
      refreshOverlayStatus();
    } finally {
      setIsLoading(false);
    }
  }, [refreshOverlayStatus]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshOverlayStatus();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }
  }, [refreshOverlayStatus]);

  const handleUpdateLabels = async () => {
      setIsUpdatingLabels(true);
      try {
          await updateActivityFieldLabels(activityLabels, appUser || undefined);
          toast({ title: 'Labels Updated' });
      } finally {
          setIsUpdatingLabels(false);
      }
  };

  const handleUpdateWhatsappTemplate = async () => {
      setIsUpdatingWhatsappTemplate(true);
      try {
          await updateWhatsappReportTemplate(whatsappTemplate, appUser || undefined);
          toast({ title: 'Template Saved' });
      } finally {
          setIsUpdatingWhatsappTemplate(false);
      }
  };

  const handleSaveWhatsAppTemplate = async (template: string) => {
    if (!appUser) return;
    try {
      await updateUser(appUser.id, { whatsAppTemplate: template });
      setAppUser(prev => prev ? { ...prev, whatsAppTemplate: template } : null);
      toast({ title: 'Template Saved' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save template.' });
    }
  };

  const handleAddExternal = async () => {
    if (!newExternal.name || !newExternal.email || !appUser) return;
    setIsAddingExternal(true);
    try {
      const added = await addExternalCoEnabler(newExternal, appUser);
      setExternalCoEnablers(prev => [...prev, added]);
      setNewExternal({ name: '', email: '' });
      setIsExternalDialogOpen(false);
      toast({ title: 'Volunteer Added' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to add volunteer' });
    } finally {
      setIsAddingExternal(false);
    }
  };

  const handleDeleteExternal = async (id: string) => {
    if (!appUser) return;
    try {
      await deleteExternalCoEnabler(id, appUser);
      setExternalCoEnablers(prev => prev.filter(v => v.id !== id));
      toast({ title: 'Volunteer Removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to remove' });
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

  const handleEnableNotifications = async () => {
    localStorage.removeItem('notification_prompt_dismissed');
    const granted = await requestNotificationPermission();
    setNotifStatus(getNotificationPermission());
    if (granted) {
      toast({ title: "Notifications Enabled", description: "Reminders will now trigger on this device." });
    } else {
      toast({ variant: 'destructive', title: "Permission Denied", description: "Enable notifications in your browser/system settings manually." });
    }
  };

  const handleTestAlarm = () => {
    window.dispatchEvent(new Event('trigger-test-alarm'));
    if (Capacitor.isNativePlatform()) {
      sendNotification('SG CRM Test', { body: 'Verification: System notification delivered successfully.' });
    }
    toast({ title: "Test Triggered", description: "Verification signal sent to Reminder Hub." });
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

            <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
              <CardHeader className="bg-card border-b border-border p-8 pb-4">
                <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                  <Bell className="h-6 w-6 text-primary" />
                  Notifications & Alarms
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verify and configure interaction reminders</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-dashed bg-muted/20 border-border">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Permission Status</p>
                    <p className="text-sm font-bold text-foreground">Current browser/app authority</p>
                  </div>
                  <Badge variant={notifStatus === 'granted' ? 'default' : 'secondary'} className="h-7 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
                    {notifStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleEnableNotifications}
                    className="h-14 rounded-2xl border-2 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest"
                  >
                    <BellRing className="mr-3 h-4 w-4" />
                    Request Access
                  </Button>
                  <Button 
                    onClick={handleTestAlarm}
                    className="h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest"
                  >
                    <Smartphone className="mr-3 h-4 w-4" />
                    Send Test Alarm
                  </Button>
                </div>

                <Alert className="bg-muted/50 border-border rounded-2xl p-6">
                  <Info className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-xs font-black uppercase tracking-widest ml-1 mb-2">Technical Note</AlertTitle>
                  <AlertDescription className="text-[11px] text-muted-foreground font-bold leading-relaxed">
                    Caller ID Overlay only works in the installed app, not in this browser preview. 
                    On Android, also enable <b>'Display over other apps'</b> in your phone's system settings 
                    for the overlay to appear during incoming calls.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {Capacitor.isNativePlatform() && (
              <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-card border-b border-border p-8 pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                    <Layers className="h-6 w-6 text-primary" />
                    Caller ID Overlay
                  </CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Required to show contact info during calls</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-dashed bg-muted/20 border-border">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Display Over Other Apps</p>
                      <p className="text-sm font-bold text-foreground">Current system permission</p>
                    </div>
                    <Badge variant={overlayStatus === 'granted' ? 'default' : 'secondary'} className="h-7 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
                      {overlayStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Button variant="outline" onClick={refreshOverlayStatus}>Re-check Status</Button>
                    <Button variant="outline" onClick={handlePreviewOverlay} disabled={isPreviewingOverlay || overlayStatus !== 'granted'}>
                      {isPreviewingOverlay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Preview Overlay
                    </Button>
                    <Button onClick={async () => { await CallLog.requestOverlayPermission(); }} disabled={overlayStatus === 'granted'}>Enable</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isPrivileged && (
              <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-card border-b border-border p-8 pb-4 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                      <UserPlus className="h-6 w-6 text-primary" />
                      External Co-Enabler Registry
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Manage recurring external volunteers for delegated outreach</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsExternalDialogOpen(true)} className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Volunteer
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border">
                        <TableHead className="pl-8 text-[10px] font-black uppercase text-muted-foreground">Name</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Email</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {externalCoEnablers.length > 0 ? externalCoEnablers.map((v) => (
                        <TableRow key={v.id} className="border-border hover:bg-muted/30">
                          <TableCell className="pl-8 font-bold text-sm uppercase text-foreground">{v.name}</TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground">{v.email}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExternal(v.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">No external volunteers registered yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <WhatsAppTemplateCard 
                initialTemplate={appUser?.whatsAppTemplate || DEFAULT_WHATSAPP_TEMPLATE} 
                onSave={handleSaveWhatsAppTemplate} 
            />

            <Card className="bg-popover border-none rounded-[2.5rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-card border-b border-border p-8 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Appearance & Personalization</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <ThemeSwitcher />
                </CardContent>
            </Card>
            
            {isAdmin && (
              <Card className="border-orange-500/20 bg-orange-500/5 rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black uppercase tracking-tight">
                    <Database className="h-5 w-5" />
                    Data Maintenance
                  </CardTitle>
                  <CardDescription className="font-bold text-orange-600/60">Advanced tools to repair legacy data and improve Dashboard accuracy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-orange-500/10 bg-background space-y-3">
                       <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <h4 className="text-sm font-black uppercase tracking-tight">isDeleted Patch</h4>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          Legacy contacts created before soft-delete may be missing the <code className="bg-muted px-1 rounded">isDeleted</code> flag.
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
                          Maps legacy name-based assignments to modern system IDs.
                       </p>
                       <Button 
                          onClick={handleBackfillEnablerIds} 
                          disabled={isBackfillingIds}
                          variant="outline"
                          className="w-full border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest"
                       >
                          {isBackfillingIds ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                          Re-map IDs
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isPrivileged && (
              <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-card border-b border-border p-8 pb-4">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">WhatsApp Report Request Template</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customize the default message sent to enablers when asking for a contact status update. Available tokens: {'{enablerName}'}, {'{contactList}'}, {'{question}'}, {'{contactCountLabel}'}.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                  <Textarea value={whatsappTemplate} onChange={e => setWhatsappTemplate(e.target.value)} className="min-h-[140px] rounded-2xl border-border bg-muted text-foreground font-bold p-5 font-mono text-xs" />
                  <div className="flex justify-end">
                    <Button onClick={handleUpdateWhatsappTemplate} disabled={isUpdatingWhatsappTemplate} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px]">
                      {isUpdatingWhatsappTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Team Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
                <CardHeader className="bg-card border-b border-border p-8 pb-4">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Calling Session Labels</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customize the display names for quick-mark fields.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="label-sg" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">SG-S Label</Label>
                      <Input id="label-sg" value={activityLabels.sg} onChange={e => setActivityLabels(p => ({...p, sg: e.target.value}))} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="label-ma" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">SG-W Label</Label>
                      <Input id="label-ma" value={activityLabels.ma} onChange={e => setActivityLabels(p => ({...p, ma: e.target.value}))} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="label-frp" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">FRP Label</Label>
                      <Input id="label-frp" value={activityLabels.frp} onChange={e => setActivityLabels(p => ({...p, frp: e.target.value}))} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleUpdateLabels} disabled={isUpdatingLabels} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px]">
                        {isUpdatingLabels ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Apply Custom Labels
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden">
              <CardHeader className="bg-card border-b border-border p-8 pb-4"><CardTitle className="text-xl font-black uppercase tracking-tight">Manage Dropdown Options</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-10">
                <EditableOptionsList title="Contact Sources" items={sources} onAdd={async i => setSources(await addContactSource(i, appUser || undefined))} onUpdate={async (o, n) => setSources(await updateContactSource(o, n, appUser || undefined))} onDelete={async i => setSources(await deleteContactSource(i, appUser || undefined))} />
                <EditableOptionsList title="Goal Categories" items={goalCategories} onAdd={async i => setGoalCategories(await addGoalCategory(i, appUser || undefined))} onUpdate={async (o, n) => setGoalCategories(await updateGoalCategory(o, n, appUser || undefined))} onDelete={async i => setGoalCategories(await deleteGoalCategory(i, appUser || undefined))} />
                <EditableOptionsList title="Current Folk Stage" items={folkStages} onAdd={async i => setFolkStages(await addCurrentFolkStage(i as FolkStage, appUser || undefined))} onUpdate={async (o, n) => setFolkStages(await updateCurrentFolkStage(o as FolkStage, n as FolkStage, appUser || undefined))} onDelete={async i => setFolkStages(await deleteCurrentFolkStage(i as FolkStage, appUser || undefined))} />
                <EditableOptionsList title="SG-S Marks" items={sgOptions} onAdd={async i => setSgOptions(await addSgOption(i, appUser || undefined))} onUpdate={async (o, n) => setSgOptions(await updateSgOption(o, n, appUser || undefined))} onDelete={async i => setSgOptions(await deleteSgOption(i, appUser || undefined))} />
                <EditableOptionsList title="SG-W Marks" items={maOptions} onAdd={async i => setMaOptions(await addMaOption(i, appUser || undefined))} onUpdate={async (o, n) => setMaOptions(await updateMaOption(o, n, appUser || undefined))} onDelete={async i => setMaOptions(await deleteMaOption(i, appUser || undefined))} />
                <EditableOptionsList title="FRP Marks" items={frpOptions} onAdd={async i => setFrpOptions(await addFrpOption(i, appUser || undefined))} onUpdate={async (o, n) => setFrpOptions(await updateFrpOption(o, n, appUser || undefined))} onDelete={async i => setFrpOptions(await deleteFrpOption(i, appUser || undefined))} />
              </CardContent>
            </Card>
            <CustomFieldsManager initialFields={customFields} onSave={async f => { await saveCustomPersonFields(f, appUser || undefined); setCustomFields(f); }} />
          </div>
        )}
      </main>

      <Dialog open={isExternalDialogOpen} onOpenChange={setIsExternalDialogOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
              <Mail className="h-5 w-5 text-primary" />
              Register Volunteer
            </DialogTitle>
            <DialogDescription className="font-bold">Add a co-enabler to the verified task registry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Volunteer Name</Label>
              <Input placeholder="e.g. Rahul Dev" value={newExternal.name} onChange={e => setNewExternal({...newExternal, name: e.target.value})} className="h-12 rounded-xl font-bold bg-muted border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Email</Label>
              <Input type="email" placeholder="volunteer@example.com" value={newExternal.email} onChange={e => setNewExternal({...newExternal, email: e.target.value})} className="h-12 rounded-xl font-bold bg-muted border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExternalDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleAddExternal} disabled={isAddingExternal || !newExternal.name || !newExternal.email} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl">
              {isAddingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Volunteer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
