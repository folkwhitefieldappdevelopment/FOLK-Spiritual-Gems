'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  PlusCircle, 
  Loader2, 
  RefreshCw, 
  Plus, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Layers, 
  SlidersHorizontal, 
  X, 
  Search, 
  PhoneCall, 
  Trash2,
  LayoutGrid,
  Edit2,
  MessageCircle,
  CopyCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import type { Person, Group, CustomField, FilterState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/contexts/toast-context";
import { PageHeader } from "@/components/page-header";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { 
  getPeople, 
  createPerson, 
  updatePerson, 
  deletePerson, 
  importPeople, 
  deletePeople, 
  subscribeToSyncStatus,
  getSyncStatus,
  type SyncStatus,
  checkDuplicatePhone
} from '@/services/people-service';
import { createGroup, getStaticGroups, addPeopleToGroup, updateGroup as updateGroupSvc } from "@/services/groups-service";
import { getEnablers, getContactSources, getStayingWithOptions, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
import { useAuth } from "@/contexts/auth-context";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { trackSessionStart } from "@/services/session-history-service";
import { exportContactsToExcel, downloadImportTemplate, parseImportFile } from "@/services/import-export-service";
import { AddContactMethodDialog } from "@/components/add-contact-method-dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ContactGalleryDialog } from "@/components/contact-gallery-dialog";
import { BulkEditPersonDialog } from '@/components/bulk-edit-person-dialog';
import { AskEnablerDialog } from '@/components/ask-enabler-dialog';
import { FreshLeadQRDialog } from "@/components/fresh-lead-qr-dialog";
import { DuplicateContactsDialog } from '@/components/duplicate-contacts-dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { updateUser } from '@/services/user-service';
import { ContactFilterPanel } from "@/components/contact-filter-panel";
import { useBackgroundTasks } from "@/contexts/background-task-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { assignCoEnablerToPeople } from "@/services/people-service";
import { AssignCoEnablerDialog } from "@/components/assign-helper-dialog";
import { getFastSummaryStats } from '@/services/dashboard-service';

const EMPTY_FILTERS: FilterState = {
    name: '', phone: '', location: '', eventName: '', callerName: '', 
    callDateFrom: '', callDateTo: '', stayingWith: '', chantingRounds: '', 
    enablerId: '', enablerName: '', callStatus: '', contactSources: [],
    stage: '', chantingRoundsMin: ''
};

const ContactsPageComponent = () => {
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startJob, updateJob } = useBackgroundTasks();

  const isPrivileged = React.useMemo(() => {
    return appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  }, [appUser]);

  const [activeTab, setActiveTab] = React.useState('my-contacts');
  const [people, setPeople] = React.useState<Person[]>([]);
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [lastDocId, setLastDocId] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [isSelectingAll, setIsSelectingAll] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(getSyncStatus());
  
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = React.useState(false);
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [sourceOptions, setSourceOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);

  const [filters, setFilters] = React.useState<FilterState>(EMPTY_FILTERS);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isAddMethodDialogOpen, setIsAddMethodDialogOpen] = React.useState(false);
  const [isPersonDialogOpen, setIsPersonDialogOpen] = React.useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = React.useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isAskEnablerOpen, setIsAskEnablerOpen] = React.useState(false);
  const [isDedupeOpen, setIsDedupeOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(undefined);
  const [personToCall, setPersonToCall] = React.useState<Person | null>(null);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false);

  // Import Preview State
  const [importPreview, setImportPreview] = React.useState<{ new: any[], duplicates: any[] } | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fetchIdRef = React.useRef(0);
  
  const isSelectionActive = selectedIds.size > 0;
  const isSyncStable = syncStatus === 'synced' || syncStatus === 'cached';

  const fetchContacts = React.useCallback(async (lastId?: string, silent = false) => {
    if (!appUser?.id) return;
    
    const thisFetchId = ++fetchIdRef.current;
    if (!lastId && !silent) { setIsLoading(true); setPeople([]); } 
    else if (lastId) { setIsLoadingMore(true); }
    
    try {
      const fetchScope = activeTab === 'all-contacts' ? 'all' : 'my';
      
      // Update global total first via server count
      const counts = await getFastSummaryStats(appUser);
      setTotalCount(fetchScope === 'all' ? counts.totalContactsCount : counts.myContactsCount);

      const result = await getPeople(appUser, { 
        scope: fetchScope, 
        lastDocId: lastId,
        filters: filters
      });
      if (thisFetchId !== fetchIdRef.current) return;
      setPeople(prev => lastId ? [...prev, ...result.people] : result.people);
      setLastDocId(result.lastDocId);
      setHasMore(result.lastDocId !== null);
    } catch (error) { 
      if (thisFetchId === fetchIdRef.current) toast({ variant: 'destructive', title: "Sync Error" }); 
    } 
    finally { 
      if (thisFetchId === fetchIdRef.current) {
        setIsLoading(false); 
        setIsLoadingMore(false); 
      }
    }
  }, [appUser, activeTab, toast, filters]);

  React.useEffect(() => {
    return subscribeToSyncStatus((status) => setSyncStatus(status));
  }, []);

  React.useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    if (Object.keys(params).length === 0) return;

    setFilters(prev => {
        const next = { ...prev };
        if (params.name) next.name = params.name;
        if (params.phone) next.phone = params.phone;
        if (params.location) next.location = params.location;
        if (params.eventName) next.eventName = params.eventName;
        if (params.callerName) next.callerName = params.callerName;
        if (params.callDateFrom) next.callDateFrom = params.callDateFrom;
        if (params.callDateTo) next.callDateTo = params.callDateTo;
        if (params.stayingWith) next.stayingWith = params.stayingWith;
        if (params.chantingRounds) next.chantingRounds = params.chantingRounds;
        if (params.callStatus) next.callStatus = params.callStatus;
        if (params.contactSources) next.contactSources = params.contactSources.split(',');
        if (params.stage) next.stage = params.stage;
        if (params.enablerId) next.enablerId = params.enablerId;
        if (params.enablerName) next.enablerName = params.enablerName;
        if (params.chantingRoundsMin) next.chantingRoundsMin = params.chantingRoundsMin;
        return next;
    });

    if (params.scope === 'all') setActiveTab('all-contacts');
    else if (params.scope === 'my') setActiveTab('my-contacts');
    
  }, [searchParams]);

  React.useEffect(() => { 
    if (appUser?.id) { fetchContacts(); }
  }, [fetchContacts, appUser?.id, isSyncStable]);

  React.useEffect(() => {
    if (appUser) {
        getEnablers(appUser).then(setEnablerOptions);
        getContactSources().then(setSourceOptions);
        getStayingWithOptions().then(setStayingWithOptions);
        getStaticGroups(appUser).then(setGroups);
    }
  }, [appUser]);

  const handleSelectAllGlobal = async () => {
    if (!appUser) return;
    setIsSelectingAll(true);
    try {
      const fetchScope = activeTab === 'all-contacts' ? 'all' : 'my';
      const { people: allMatching } = await getPeople(appUser, { 
        scope: fetchScope,
        filters: filters,
        ignoreLimit: true 
      });
      setSelectedIds(new Set(allMatching.map(p => p.id)));
      toast({ title: 'Full List Selected', description: `${allMatching.length} contacts marked.` });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleSelectRangeGlobal = async (from: number, to: number) => {
    if (!appUser) return;
    setIsSelectingAll(true);
    try {
      const fetchScope = activeTab === 'all-contacts' ? 'all' : 'my';
      const { people: allMatching } = await getPeople(appUser, {
        scope: fetchScope,
        filters: filters,
        ignoreLimit: true
      });
      const start = Math.max(0, from - 1);
      const end = Math.min(allMatching.length, to);
      if (start >= end) return;
      const idsToSelect = allMatching.slice(start, end).map(p => p.id);
      setSelectedIds(prev => new Set([...Array.from(prev), ...idsToSelect]));
      toast({ title: 'Range Selected', description: `${idsToSelect.length} contacts marked (rows ${from}–${to}).` });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appUser) return;

    try {
        const mappedData = await parseImportFile(file);
        const newContacts = [];
        const duplicates = [];

        for (const row of mappedData) {
            const existing = await checkDuplicatePhone(row.phone);
            if (existing) duplicates.push(row);
            else newContacts.push(row);
        }

        setImportPreview({ new: newContacts, duplicates });
        setIsImportPreviewOpen(true);
    } catch (error) {
        toast({ variant: 'destructive', title: "Parsing Failed" });
    } finally {
        if (e.target) e.target.value = '';
    }
  };

  const executeImport = async (updateDuplicates: boolean) => {
    if (!importPreview || !appUser) return;
    setIsImportPreviewOpen(false);

    const dataToImport = updateDuplicates 
        ? [...importPreview.new, ...importPreview.duplicates]
        : importPreview.new;

    if (dataToImport.length === 0) {
        toast({ title: "Import Skipped", description: "No new records to import." });
        return;
    }

    const jobId = startJob({ 
        type: 'import', 
        fileName: 'Spreadsheet Import', 
        total: dataToImport.length 
    });

    try {
      const result = await importPeople(dataToImport, appUser, (current) => {
        updateJob(jobId, { current });
      });

      updateJob(jobId, { 
        status: 'success', 
        errors: result.errors 
      });
      
      fetchContacts(undefined, true);
    } catch (error) { 
      updateJob(jobId, { status: 'error' });
      toast({ variant: 'destructive', title: "Import Failed" }); 
    }
  };

  const handleExportExcel = async () => {
    if (!appUser) return;
    
    const jobId = startJob({ type: 'export', fileName: `SG_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`, total: people.length });

    try {
      await exportContactsToExcel(people, "SG_Export", groups, (current) => {
        updateJob(jobId, { current });
      });
      updateJob(jobId, { status: 'success' });
    } catch (e) {
      updateJob(jobId, { status: 'error' });
      toast({ variant: 'destructive', title: "Export Failed" });
    }
  };

  const handleBulkDelete = async () => {
    if (appUser && selectedIds.size > 0) {
      await deletePeople(Array.from(selectedIds), appUser);
      toast({ title: 'Contacts Deleted' });
      setSelectedIds(new Set());
      fetchContacts(undefined, true);
    }
  };

  const handleBulkAddToGroup = async (groupId: string) => {
    if (appUser && selectedIds.size > 0) {
      await addPeopleToGroup(groupId, Array.from(selectedIds), appUser);
      toast({ title: 'Added to Group' });
      setSelectedIds(new Set());
    }
  };

  const handleStartSession = React.useCallback(async (eventName: string) => {
    if (!appUser) return;
    try {
        let pIds: string[] = [];
        if (personToCall) pIds = [personToCall.id];
        else if (selectedIds.size > 0) pIds = Array.from(selectedIds);
        else {
            const fetchScope = activeTab === 'all-contacts' ? 'all' : 'my';
            const { people: all } = await getPeople(appUser, { scope: fetchScope, filters: filters, ignoreLimit: true });
            pIds = all.map(p => p.id);
        }
        const { people: sPeople } = await getPeople(appUser, { personIds: pIds, ignoreLimit: true });
        const coIds = [...new Set(sPeople.map(p => p.coEnablerId).filter((id): id is string => !!id && id !== appUser.id))];
        const hId = await trackSessionStart({ name: eventName, peopleIds: pIds, coEnablerIds: coIds }, appUser);
        const pSession = { event: eventName, peopleIds: pIds, currentIndex: 0, assignedById: appUser.id, assignedByName: appUser.name, historyId: hId, coEnablerIds: coIds };
        await updateUser(appUser.id, { pausedCallingSession: pSession });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: pSession} : null);
        router.push('/session');
    } catch (e) { toast({ variant: 'destructive', title: 'Session Error' }); }
  }, [appUser, setAppUser, personToCall, selectedIds, activeTab, filters, router, toast]);

  const handleQuickSearch = (val: string) => {
      const isNum = /^[0-9]+$/.test(val);
      setFilters(prev => ({ ...prev, name: isNum ? '' : val, phone: isNum ? val : '' }));
  };

  const selectedPeople = React.useMemo(() => {
    return people.filter(p => selectedIds.has(p.id));
  }, [people, selectedIds]);

  return (
    <>
      <PageHeader title="Outreach" description={totalCount !== null ? `Managing ${totalCount} records.` : "Outreach management."}>
        <div className="flex items-center gap-1.5 py-1">
            {isPrivileged && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDedupeOpen(true)} 
                className="h-9 font-bold px-2.5 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary"
              >
                  <CopyCheck className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Deduplicate</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchContacts(undefined, true)} disabled={isLoading} className="h-9 font-bold px-2.5 rounded-xl border-2 border-border bg-muted/50 text-foreground">
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isLoading && "animate-spin")} /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 font-bold px-2.5 rounded-xl border-2 border-border bg-muted/50 text-foreground"><FileSpreadsheet className="h-4 w-4 sm:mr-2" /> <span className="hidden xs:inline">Data</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border max-w-[240px]">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary/70 px-2 py-1">Import & Export</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="font-bold"><Upload className="mr-2 h-4 w-4" /> Import Excel</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExportExcel} className="font-bold"><Download className="mr-2 h-4 w-4" /> Export Full List</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onSelect={() => appUser && downloadImportTemplate(appUser)} className="font-bold"><Layers className="mr-2 h-4 w-4" /> Download Template</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" onClick={() => setIsAddMethodDialogOpen(true)} className="h-9 w-9 bg-primary hover:bg-primary/90 rounded-full shadow-lg ml-2"><Plus className="h-5 w-5 text-primary-foreground" /></Button>
        </div>
        <input type="file" hide="true" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileSelection} />
      </PageHeader>
      
      <main className="flex-1 p-4 sm:px-6 space-y-6 pb-20">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); }} className="w-full">
            <TabsList className="mb-8 flex w-full h-auto p-1.5 bg-card border-none rounded-2xl gap-1.5">
                <TabsTrigger value="my-contacts" className="flex-1 py-3 px-8 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-primary">CONTACTS (MINE)</TabsTrigger>
                {isPrivileged && <TabsTrigger value="all-contacts" className="flex-1 py-3 px-8 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-primary">CONTACTS (ALL)</TabsTrigger>}
            </TabsList>
            
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="Quick search name or phone..." className="h-14 pl-12 rounded-2xl bg-card border-none text-foreground font-bold shadow-2xl focus-visible:ring-primary" value={filters.name || filters.phone} onChange={(e) => handleQuickSearch(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)} className={cn("h-14 px-8 w-full md:w-auto rounded-2xl border-border bg-card text-foreground font-black uppercase tracking-widest text-[10px]", isAdvancedSearchOpen && "bg-primary text-primary-foreground border-primary")}>
                        <SlidersHorizontal className="h-4 w-4 mr-3" /> {isAdvancedSearchOpen ? 'Hide Options' : 'Filters'}
                    </Button>
                </div>

                {isSelectionActive && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-primary rounded-2xl sticky top-20 z-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3 px-4"><div className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-xs font-black text-primary-foreground shadow-inner uppercase tracking-wider">{selectedIds.size} selected</div></div>
                        <div className="flex flex-wrap items-center gap-2 ml-auto pr-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsConfirmSessionDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl"><PhoneCall className="mr-2 h-4 w-4" /> Start Session</Button>
                            
                            {isPrivileged && (
                                <Button variant="ghost" size="sm" onClick={() => setIsAskEnablerOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                    <MessageCircle className="mr-2 h-4 w-4" /> Ask Enabler
                                </Button>
                            )}

                            <Button variant="ghost" size="sm" onClick={() => setIsBulkEditOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                <Edit2 className="mr-2 h-4 w-4" /> Edit Fields
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">Group</Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-popover text-foreground p-2 rounded-2xl shadow-2xl">
                                    <DropdownMenuItem onSelect={() => setIsGroupDialogOpen(true)} className="font-black text-xs uppercase tracking-tight py-3 px-4 rounded-xl"><PlusCircle className="mr-3 h-5 w-5" /> New Group</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border my-2" />
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4 py-2">Add to</DropdownMenuLabel>
                                    <ScrollArea className="max-h-60">{groups.map(g => (<DropdownMenuItem key={g.id} onSelect={() => handleBulkAddToGroup(g.id)} className="font-bold text-xs py-3 px-4 rounded-xl">{g.name}</DropdownMenuItem>))}</ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-10 w-10 bg-red-600 hover:bg-red-700 rounded-xl shrink-0"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent className="bg-popover border-none rounded-[2rem] shadow-2xl"><AlertDialogHeader><AlertDialogTitle className="font-black uppercase tracking-tight">Bulk Delete</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground font-bold">Delete {selectedIds.size} selected contacts? Action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-muted rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 rounded-xl font-black uppercase tracking-widest">Delete All</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="h-10 w-10 rounded-xl text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"><X className="h-5 w-5" /></Button>
                        </div>
                    </div>
                )}
            </div>

            <Collapsible open={isAdvancedSearchOpen}>
                <CollapsibleContent>
                    <ContactFilterPanel 
                        filters={filters} 
                        onChange={setFilters} 
                        onApply={fetchContacts} 
                        onReset={() => setFilters(EMPTY_FILTERS)}
                        enablerOptions={enablerOptions}
                        sourceOptions={sourceOptions}
                        stayingWithOptions={stayingWithOptions}
                    />
                </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-center mb-8">
                <Button variant="outline" size="lg" onClick={() => setIsGalleryOpen(true)} className="h-12 px-8 rounded-2xl border-border bg-card text-foreground font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl">
                    <LayoutGrid className="h-4 w-4 mr-3" /> Gallery View
                </Button>
            </div>

            <TabsContent value="my-contacts" className="mt-0 focus-visible:outline-none">
                <PersonTable 
                  people={people} 
                  onEdit={setEditingPerson} 
                  onDelete={id => deletePerson(id, appUser!).then(() => fetchContacts(undefined, true))} 
                  onStartCall={p => { setPersonToCall(p); setIsConfirmSessionDialogOpen(true); }} 
                  selectedIds={selectedIds} 
                  setSelectedIds={setSelectedIds} 
                  showEnablerColumn={true} 
                  totalCount={totalCount} 
                  isLoading={isLoading} 
                  navigationContext={{ scope: 'my' }} 
                  onSelectAllGlobal={handleSelectAllGlobal} 
                  onSelectRangeGlobal={handleSelectRangeGlobal}
                  isSelectingAll={isSelectingAll} 
                  isSelectionActive={isSelectionActive} 
                />
                {hasMore && !isLoading && <div className="flex justify-center pb-12 pt-6"><Button onClick={() => fetchContacts(lastDocId || undefined)} disabled={isLoadingMore} variant="outline" className="font-bold px-8 h-12 rounded-xl border-border text-foreground bg-muted/50 uppercase tracking-widest text-[10px]">Load More Records</Button></div>}
            </TabsContent>
            
            {isPrivileged && (
                <TabsContent value="all-contacts" className="mt-0 focus-visible:outline-none">
                    <PersonTable 
                      people={people} 
                      onEdit={setEditingPerson} 
                      onDelete={id => deletePerson(id, appUser!).then(() => fetchContacts(undefined, true))} 
                      onStartCall={p => { setPersonToCall(p); setIsConfirmSessionDialogOpen(true); }} 
                      selectedIds={selectedIds} 
                      setSelectedIds={setSelectedIds} 
                      showEnablerColumn={true} 
                      totalCount={totalCount} 
                      isLoading={isLoading} 
                      navigationContext={{ scope: 'all' }} 
                      onSelectAllGlobal={handleSelectAllGlobal} 
                      onSelectRangeGlobal={handleSelectRangeGlobal}
                      isSelectingAll={isSelectingAll} 
                      isSelectionActive={isSelectionActive} 
                    />
                    {hasMore && !isLoading && <div className="flex justify-center pb-12 pt-6"><Button onClick={() => fetchContacts(lastDocId || undefined)} disabled={isLoadingMore} variant="outline" className="font-bold px-8 h-12 rounded-xl border-border text-foreground bg-muted/50 uppercase tracking-widest text-[10px]">Load More Records</Button></div>}
                </TabsContent>
            )}
        </Tabs>
      </main>

      <Dialog hide="true" open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
        <DialogContent className="sm:max-w-xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4 bg-card border-b border-border">
            <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Import Preview
            </DialogTitle>
            <DialogDescription className="font-bold">Review detected duplicates before writing to database.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                <p className="text-2xl font-black text-green-600">{importPreview?.new.length}</p>
                <p className="text-[10px] font-black uppercase text-green-700/60 tracking-widest">New Contacts</p>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                <p className="text-2xl font-black text-amber-600">{importPreview?.duplicates.length}</p>
                <p className="text-[10px] font-black uppercase text-amber-700/60 tracking-widest">Existing Matches</p>
              </div>
            </div>

            {importPreview?.duplicates.length ? (
                <div className="bg-muted p-5 rounded-2xl border border-border flex gap-4">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        We found contacts already in your database. Do you want to update their fields with the new information, or skip them and only add new records?
                    </p>
                </div>
            ) : null}
          </div>
          <DialogFooter className="p-8 bg-card border-t border-border flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setIsImportPreviewOpen(false)} className="rounded-xl font-bold flex-1">Cancel</Button>
             {importPreview?.duplicates.length ? (
                 <Button variant="outline" onClick={() => executeImport(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest flex-1 border-primary/20 text-primary">Skip Duplicates</Button>
             ) : null}
             <Button onClick={() => executeImport(true)} className="rounded-xl font-black uppercase text-[10px] tracking-widest flex-1 shadow-xl shadow-primary/20">
                {importPreview?.duplicates.length ? 'Update & Import' : 'Confirm Import'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddContactMethodDialog isOpen={isAddMethodDialogOpen} setIsOpen={setIsAddMethodDialogOpen} onSelectManual={() => { setEditingPerson(undefined); setIsPersonDialogOpen(true); }} onSelectQR={() => setIsQrDialogOpen(true)} onSelectNewGroup={() => { setEditingGroup(undefined); setIsGroupDialogOpen(true); }} />
      <CreateUpdatePersonDialog isOpen={isPersonDialogOpen} setIsOpen={setIsPersonDialogOpen} onSave={async d => { const r = editingPerson ? await updatePerson(editingPerson.id, d, appUser!) : await createPerson(d, appUser!); if (r.success) fetchContacts(undefined, true); return r; }} person={editingPerson} allPeople={people} />
      <CreateUpdateGroupDialog isOpen={isGroupDialogOpen} setIsOpen={setIsGroupDialogOpen} group={editingGroup} onSave={async (d) => { editingGroup ? await updateGroupSvc(editingGroup.id, d, appUser!) : await createGroup(d, appUser!); getStaticGroups(appUser!).then(setGroups); }} />
      <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} onResumeSession={() => router.push('/session')} singlePersonName={personToCall?.fullName || editingGroup?.name} pausedSession={appUser?.pausedCallingSession} totalCount={personToCall ? 1 : (isSelectionActive ? selectedIds.size : (editingGroup?.peopleIds?.length || 0))} />
      <ContactGalleryDialog isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} people={people} />
      <FreshLeadQRDialog isOpen={isQrDialogOpen} setIsOpen={setIsQrDialogOpen} />
      
      <BulkEditPersonDialog 
        isOpen={isBulkEditOpen} 
        setIsOpen={setIsBulkEditOpen} 
        selectedIds={Array.from(selectedIds)} 
        onSuccess={() => { fetchContacts(undefined, true); setSelectedIds(new Set()); }} 
      />

      <AssignCoEnablerDialog 
        isOpen={isAssignCoEnablerDialogOpen} 
        setIsOpen={setIsAssignCoEnablerDialogOpen} 
        onSave={async (u) => { 
            if (u) await assignCoEnablerToPeople(Array.from(selectedIds), u, appUser!); 
            fetchContacts(undefined, true); 
            setSelectedIds(new Set()); 
        }} 
        peopleCount={selectedIds.size} 
        selectedPersonIds={Array.from(selectedIds)} 
      />

      <AskEnablerDialog 
        isOpen={isAskEnablerOpen} 
        setIsOpen={setIsAskEnablerOpen} 
        mode="bulk" 
        people={selectedPeople} 
    />

      <DuplicateContactsDialog 
        isOpen={isDedupeOpen} 
        setIsOpen={setIsDedupeOpen} 
        onSuccess={() => fetchContacts(undefined, true)} 
      />
    </>
  );
};

export default function ContactsPage() { return <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><ContactsPageComponent /></React.Suspense>; }