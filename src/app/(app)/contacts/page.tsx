'use client';

import * as React from "react";
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
  Calendar,
  User,
  History,
  LayoutGrid,
  UserCheck,
  Tag,
  ChevronDown
} from "lucide-react";
import type { Person, Group, CustomField } from "@/lib/types";
import { callStatuses } from "@/lib/types";
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
  assignEnablerToPeople, 
  assignCoEnablerToPeople, 
  updatePeopleContactSource,
  subscribeToSyncStatus,
  getSyncStatus,
  type SyncStatus
} from '@/services/people-service';
import { createGroup, getStaticGroups, addPeopleToGroup, updateGroup as updateGroupSvc } from "@/services/groups-service";
import { getEnablers, getContactSources, getStayingWithOptions, getCustomPersonFields, type EnablerOption } from "@/services/settings-service";
import { useAuth } from "@/contexts/auth-context";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmSessionDialog } from '@/components/confirm-session-dialog';
import { trackSessionStart } from "@/services/session-history-service";
import { exportContactsToExcel, downloadImportTemplate } from "@/services/import-export-service";
import { AddContactMethodDialog } from "@/components/add-contact-method-dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ContactGalleryDialog } from "@/components/contact-gallery-dialog";
import { AssignEnablerDialog } from '@/components/assign-enabler-dialog';
import { AssignCoEnablerDialog } from '@/components/assign-helper-dialog';
import { UpdateContactSourceDialog } from '@/components/update-contact-source-dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { updateUser } from '@/services/user-service';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

const ContactsPageComponent = () => {
  const { toast } = useAppToast();
  const { appUser, setAppUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);

  const [filters, setFilters] = React.useState({
    name: '', phone: '', location: '', eventName: '', callerName: '', 
    callDateFrom: '', callDateTo: '', stayingWith: '', chantingRounds: '', 
    enablerInTouchWith: '', callStatus: '', contactSources: [] as string[],
    stage: '', enablerId: '', enablerName: '', chantingRoundsMin: ''
  });

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isAddMethodDialogOpen, setIsAddMethodDialogOpen] = React.useState(false);
  const [isPersonDialogOpen, setIsPersonDialogOpen] = React.useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(undefined);
  const [personToCall, setPersonToCall] = React.useState<Person | null>(null);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);
  
  const [isAssignEnablerDialogOpen, setIsAssignEnablerDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isUpdateSourceDialogOpen, setIsUpdateSourceDialogOpen] = React.useState(false);

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
      const result = await getPeople(appUser, { 
        scope: fetchScope, 
        lastDocId: lastId,
        filters: filters as any
      });

      if (thisFetchId !== fetchIdRef.current) return;

      setPeople(prev => lastId ? [...prev, ...result.people] : result.people);
      setLastDocId(result.lastDocId);
      setTotalCount(result.totalCount);
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
    return subscribeToSyncStatus(setSyncStatus);
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
        if (params.enablerInTouchWith) next.enablerInTouchWith = params.enablerInTouchWith;
        if (params.callStatus) next.callStatus = params.callStatus;
        if (params.contactSources) next.contactSources = params.contactSources.split(',');
        // Deep-link filters
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
    if (appUser?.id) { 
        fetchContacts(); 
    }
  }, [fetchContacts, appUser?.id, isSyncStable]);

  React.useEffect(() => {
    if (appUser) {
        getEnablers(appUser).then(setEnablerOptions);
        getContactSources().then(setSourceOptions);
        getStayingWithOptions().then(setStayingWithOptions);
        getCustomPersonFields().then(setCustomFields);
        getStaticGroups(appUser).then(setGroups);
    }
  }, [appUser]);

  const recordsDescription = React.useMemo(() => {
    if (!isSyncStable && (totalCount === 0 || totalCount === null)) {
      return "Synchronizing records...";
    }
    return totalCount !== null ? `Managing ${totalCount} records in this view.` : "Outreach management.";
  }, [isSyncStable, totalCount]);

  const handleSelectAllGlobal = async () => {
    if (!appUser) return;
    setIsSelectingAll(true);
    try {
      const fetchScope = activeTab === 'all-contacts' ? 'all' : 'my';
      const { people: allMatching } = await getPeople(appUser, { 
        scope: fetchScope,
        filters: filters as any,
        ignoreLimit: true 
      });
      setSelectedIds(new Set(allMatching.map(p => p.id)));
      toast({ title: 'Full List Selected', description: `${allMatching.length} contacts marked.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Selection Failed' });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appUser) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) return;
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            const mappedData = data.map(row => ({
                fullName: row['Full Name'] || row['fullName'],
                phone: String(row['Phone'] || row['phone'] || ''),
                age: Number(row['Age'] || row['age'] || 18),
                currentFolkStage: row['Current Folk Stage'] || row['currentFolkStage'],
                location: row['Location'] || row['location'],
                stayingWith: row['Staying With'] || row['stayingWith'],
                occupation: row['Occupation'] || row['occupation'],
                organisation: row['Organisation'] || row['organisation'],
                contactSource: row['Contact Source'] ? String(row['Contact Source']).split(',').map((s:string) => s.trim()) : [],
            }));

            await importPeople(mappedData, appUser);
            toast({ title: "Import Successful", description: "Contacts synchronized." });
            fetchContacts(undefined, true);
        } catch (error) { 
            toast({ variant: 'destructive', title: "Import Failed" }); 
        }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
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
            const { people: all } = await getPeople(appUser, { scope: fetchScope, filters: filters as any, ignoreLimit: true });
            pIds = all.map(p => p.id);
        }

        const { people: sPeople } = await getPeople(appUser, { personIds: pIds, ignoreLimit: true });
        const coIds = [...new Set(sPeople.map(p => p.coEnablerId).filter((id): id is string => !!id && id !== appUser.id))];

        const hId = await trackSessionStart({
            name: eventName,
            peopleIds: pIds,
            coEnablerIds: coIds
        }, appUser);
        
        const pSession = {
            event: eventName,
            peopleIds: pIds,
            currentIndex: 0,
            assignedById: appUser.id,
            assignedByName: appUser.name,
            historyId: hId,
            coEnablerIds: coIds
        };
        await updateUser(appUser.id, { pausedCallingSession: pSession });
        setAppUser(prev => prev ? {...prev, pausedCallingSession: pSession} : null);
        router.push('/session');
    } catch (e) { toast({ variant: 'destructive', title: 'Session Error' }); }
  }, [appUser, setAppUser, personToCall, selectedIds, activeTab, filters, router, toast]);

  const resetFilters = () => {
    setFilters({
        name: '', phone: '', location: '', eventName: '', callerName: '', 
        callDateFrom: '', callDateTo: '', stayingWith: '', chantingRounds: '', 
        enablerInTouchWith: '', callStatus: '', contactSources: [],
        stage: '', enablerId: '', enablerName: '', chantingRoundsMin: ''
    });
  };

  const handleQuickSearch = (val: string) => {
      const isNum = /^[0-9]+$/.test(val);
      setFilters(prev => ({
          ...prev,
          name: isNum ? '' : val,
          phone: isNum ? val : ''
      }));
  };

  return (
    <>
      <PageHeader title="Outreach" description={recordsDescription}>
        <div className="flex items-center gap-1.5 py-1">
            <Button variant="outline" size="sm" onClick={() => fetchContacts(undefined, true)} disabled={isLoading} className="h-9 font-bold px-2.5 rounded-xl border-2 border-border bg-muted/50 text-foreground">
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isLoading && "animate-spin")} /> 
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 font-bold px-2.5 rounded-xl border-2 border-border bg-muted/50 text-foreground"><FileSpreadsheet className="h-4 w-4 sm:mr-2" /> <span className="hidden xs:inline">Data</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                    <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="font-bold"><Upload className="mr-2 h-4 w-4" /> Import Excel</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => exportContactsToExcel(people, "SG_Export", groups)} className="font-bold"><Download className="mr-2 h-4 w-4" /> Export Full List</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onSelect={downloadImportTemplate} className="font-bold"><Layers className="mr-2 h-4 w-4" /> Download Template</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" onClick={() => setIsAddMethodDialogOpen(true)} className="h-9 w-9 bg-primary hover:bg-primary/90 rounded-full shadow-lg ml-2"><Plus className="h-5 w-5 text-primary-foreground" /></Button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
      </PageHeader>
      
      <main className="flex-1 p-4 sm:px-6 space-y-6 pb-20">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); }} className="w-full">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="mb-8 flex w-max sm:w-full h-auto p-1.5 bg-card border-none rounded-2xl gap-1.5 min-w-full">
                    <TabsTrigger value="my-contacts" className="flex-1 py-3 px-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground whitespace-nowrap uppercase">CONTACTS (MINE)</TabsTrigger>
                    {isPrivileged && <TabsTrigger value="all-contacts" className="flex-1 py-3 px-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground whitespace-nowrap uppercase">CONTACTS (ALL)</TabsTrigger>}
                </TabsList>
            </div>
            
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Quick search by name or phone..." 
                            className="h-14 pl-12 rounded-2xl bg-card border-none text-foreground font-bold shadow-2xl focus-visible:ring-primary"
                            value={filters.name || filters.phone}
                            onChange={(e) => handleQuickSearch(e.target.value)}
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                        className={cn(
                            "h-14 px-8 w-full md:w-auto rounded-2xl border-border bg-card text-foreground hover:bg-muted font-black uppercase tracking-widest text-[10px]",
                            isAdvancedSearchOpen && "bg-primary text-primary-foreground border-primary"
                        )}
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-3" />
                        {isAdvancedSearchOpen ? 'Hide Options' : 'Filters'}
                    </Button>
                </div>

                {isSelectionActive && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-primary rounded-2xl sticky top-20 z-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3 px-4">
                            <div className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-xs font-black text-primary-foreground shadow-inner uppercase tracking-wider">
                                {selectedIds.size} selected
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 ml-auto pr-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsConfirmSessionDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                <PhoneCall className="mr-2 h-4 w-4" /> Start Session
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                        Group
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-popover border-border text-foreground p-2 rounded-2xl shadow-2xl border-none">
                                    <DropdownMenuItem onSelect={() => setIsGroupDialogOpen(true)} className="font-black text-xs uppercase tracking-tight py-3 px-4 focus:bg-muted rounded-xl cursor-pointer">
                                        <PlusCircle className="mr-3 h-5 w-5" /> Create New Group
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border my-2" />
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4 py-2">Add Selected To</DropdownMenuLabel>
                                    <ScrollArea className="max-h-60">
                                        {groups.map(g => (
                                            <DropdownMenuItem key={g.id} onSelect={() => handleBulkAddToGroup(g.id)} className="font-bold text-xs py-3 px-4 focus:bg-muted rounded-xl cursor-pointer">
                                                {g.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="ghost" size="sm" onClick={() => setIsAssignEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                Enabler
                            </Button>

                            <Button variant="ghost" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                Co-Enabler
                            </Button>

                            <Button variant="ghost" size="sm" onClick={() => setIsUpdateSourceDialogOpen(true)} className="h-10 px-4 font-black uppercase text-[10px] tracking-widest text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                                Source
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-10 w-10 font-bold shadow-xl bg-red-600 hover:bg-red-700 rounded-xl shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-popover border-none text-foreground rounded-[2rem]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-black uppercase tracking-tight">Bulk Delete Contacts</AlertDialogTitle>
                                        <AlertDialogDescription className="text-muted-foreground font-bold">
                                            Are you sure you want to delete {selectedIds.size} selected contacts? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-muted border-border text-foreground rounded-xl">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 rounded-xl font-black uppercase tracking-widest">Delete All</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="h-10 w-10 rounded-xl text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Collapsible open={isAdvancedSearchOpen}>
                <CollapsibleContent>
                    <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-6 sm:p-8 space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#FF9800]">ADVANCED SEARCH PARAMETERS</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">LOCATION</Label>
                                    <Input placeholder="Search area..." value={filters.location} onChange={e => setFilters(p => ({...p, location: e.target.value}))} className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4 focus-visible:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><UserCheck className="h-3 w-3" /> PRIMARY ENABLER</Label>
                                    <Select value={filters.enablerInTouchWith} onValueChange={v => setFilters(p => ({...p, enablerInTouchWith: v}))}>
                                        <SelectTrigger className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4"><SelectValue placeholder="Select coordinator..." /></SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-foreground">
                                            {enablerOptions.map(o => <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><Tag className="h-3 w-3" /> CONTACT SOURCE</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4 justify-between">
                                                <span className="truncate">{filters.contactSources.length > 0 ? `${filters.contactSources.length} selected` : 'Choose sources...'}</span>
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="bg-popover border-border text-foreground p-2 w-[240px]">
                                            <ScrollArea className="h-[200px]">
                                                <div className="space-y-1">
                                                    {sourceOptions.map(o => (
                                                        <div key={o} className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => {
                                                            const next = filters.contactSources.includes(o) ? filters.contactSources.filter(s => s !== o) : [...filters.contactSources, o];
                                                            setFilters(p => ({...p, contactSources: next}));
                                                        }}>
                                                            <Checkbox checked={filters.contactSources.includes(o)} onCheckedChange={() => {}} />
                                                            <span className="text-xs font-bold">{o}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><History className="h-3 w-3" /> EVENT NAME (HISTORY)</Label>
                                    <Input placeholder="e.g. Sunday Feast..." value={filters.eventName} onChange={e => setFilters(p => ({...p, eventName: e.target.value}))} className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4 focus-visible:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><User className="h-3 w-3" /> CALLER NAME (HISTORY)</Label>
                                    <Input placeholder="Who logged it?..." value={filters.callerName} onChange={e => setFilters(p => ({...p, callerName: e.target.value}))} className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4 focus-visible:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><Calendar className="h-3 w-3" /> CALL DATE FROM</Label>
                                    <Input type="date" value={filters.callDateFrom} onChange={e => setFilters(p => ({...p, callDateFrom: e.target.value}))} className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">STAYING WITH</Label>
                                    <Select value={filters.stayingWith} onValueChange={v => setFilters(p => ({...p, stayingWith: v}))}>
                                        <SelectTrigger className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4"><SelectValue placeholder="Staying with..." /></SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-foreground">
                                            {stayingWithOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">CHANTING ROUNDS</Label>
                                    <Select value={filters.chantingRounds} onValueChange={v => setFilters(p => ({...p, chantingRounds: v}))}>
                                        <SelectTrigger className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4"><SelectValue placeholder="Chanting rounds..." /></SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-foreground">
                                            {Array.from({length: 17}, (_, i) => i.toString()).map(r => <SelectItem key={r} value={r} className="font-bold">{r} Rounds</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">CALL STATUS</Label>
                                    <Select value={filters.callStatus} onValueChange={v => setFilters(p => ({...p, callStatus: v}))}>
                                        <SelectTrigger className="h-11 sm:h-12 bg-muted border-none rounded-xl text-foreground font-bold px-4"><SelectValue placeholder="Status..." /></SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-foreground">
                                            {callStatuses.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-border">
                                <Button variant="ghost" onClick={resetFilters} className="w-full sm:w-auto font-black text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-muted/50 px-8 h-12 rounded-xl">Clear Filters</Button>
                                <Button onClick={() => { fetchContacts(); }} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[9px] sm:text-[10px] tracking-widest px-12 h-14 rounded-2xl shadow-xl shadow-primary/20">Apply Analysis</Button>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-center mb-8">
                <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setIsGalleryOpen(true)} 
                    className="h-12 px-8 rounded-2xl border-border bg-card text-foreground hover:bg-muted font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl"
                >
                    <LayoutGrid className="h-4 w-4 mr-3" />
                    Gallery View
                </Button>
            </div>

            <TabsContent value="my-contacts" className="mt-0 focus-visible:outline-none">
                <PersonTable people={people} onEdit={setEditingPerson} onDelete={id => deletePerson(id, appUser!).then(() => fetchContacts(undefined, true))} onStartCall={p => { setPersonToCall(p); setIsConfirmSessionDialogOpen(true); }} selectedIds={selectedIds} setSelectedIds={setSelectedIds} showEnablerColumn={true} totalCount={totalCount} isLoading={isLoading} navigationContext={{ scope: 'my' }} onSelectAllGlobal={handleSelectAllGlobal} isSelectingAll={isSelectingAll} isSelectionActive={isSelectionActive} />
                {hasMore && !isLoading && <div className="flex justify-center pb-12 pt-6"><Button onClick={() => fetchContacts(lastDocId || undefined)} disabled={isLoadingMore} variant="outline" className="font-bold px-8 h-12 rounded-xl border-border text-foreground bg-muted/50 uppercase tracking-widest text-[10px]">Load More Records</Button></div>}
            </TabsContent>
            
            {isPrivileged && (
                <TabsContent value="all-contacts" className="mt-0 focus-visible:outline-none">
                    <PersonTable people={people} onEdit={setEditingPerson} onDelete={id => deletePerson(id, appUser!).then(() => fetchContacts(undefined, true))} onStartCall={p => { setPersonToCall(p); setIsConfirmSessionDialogOpen(true); }} selectedIds={selectedIds} setSelectedIds={setSelectedIds} showEnablerColumn={true} totalCount={totalCount} isLoading={isLoading} navigationContext={{ scope: 'all' }} onSelectAllGlobal={handleSelectAllGlobal} isSelectingAll={isSelectingAll} isSelectionActive={isSelectionActive} />
                    {hasMore && !isLoading && <div className="flex justify-center pb-12 pt-6"><Button onClick={() => fetchContacts(lastDocId || undefined)} disabled={isLoadingMore} variant="outline" className="font-bold px-8 h-12 rounded-xl border-border text-foreground bg-muted/50 uppercase tracking-widest text-[10px]">Load More Records</Button></div>}
                </TabsContent>
            )}
        </Tabs>
      </main>

      <AddContactMethodDialog isOpen={isAddMethodDialogOpen} setIsOpen={setIsAddMethodDialogOpen} onSelectManual={() => { setEditingPerson(undefined); setIsPersonDialogOpen(true); }} onSelectQR={() => router.push('/dashboard')} onSelectNewGroup={() => { setEditingGroup(undefined); setIsGroupDialogOpen(true); }} />
      <CreateUpdatePersonDialog isOpen={isPersonDialogOpen} setIsOpen={setIsPersonDialogOpen} onSave={async d => { const r = editingPerson ? await updatePerson(editingPerson.id, d, appUser!) : await createPerson(d, appUser!); if (r.success) fetchContacts(undefined, true); return r; }} person={editingPerson} allPeople={people} />
      <CreateUpdateGroupDialog isOpen={isGroupDialogOpen} setIsOpen={setIsGroupDialogOpen} group={editingGroup} onSave={async (d) => { editingGroup ? await updateGroupSvc(editingGroup.id, d, appUser!) : await createGroup(d, appUser!); getStaticGroups(appUser!).then(setGroups); }} />
      <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={handleStartSession} onResumeSession={() => router.push('/session')} singlePersonName={personToCall?.fullName || editingGroup?.name} pausedSession={appUser?.pausedCallingSession} totalCount={personToCall ? 1 : (isSelectionActive ? selectedIds.size : (editingGroup?.peopleIds?.length || 0))} />
      <ContactGalleryDialog isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} people={people} />
      <AssignEnablerDialog isOpen={isAssignEnablerDialogOpen} setIsOpen={setIsAssignEnablerDialogOpen} onSave={async (u) => { await assignEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchContacts(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
      <AssignCoEnablerDialog isOpen={isAssignCoEnablerDialogOpen} setIsOpen={setIsAssignCoEnablerDialogOpen} onSave={async (u) => { await assignCoEnablerToPeople(Array.from(selectedIds), u, appUser!); fetchContacts(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} selectedPersonIds={Array.from(selectedIds)} />
      <UpdateContactSourceDialog isOpen={isUpdateSourceDialogOpen} setIsOpen={setIsUpdateSourceDialogOpen} onSave={async (s) => { await updatePeopleContactSource(Array.from(selectedIds), s, appUser!); fetchContacts(undefined, true); setSelectedIds(new Set()); }} peopleCount={selectedIds.size} />
    </>
  );
};

export default function ContactsPage() { return <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><ContactsPageComponent /></React.Suspense>; }
