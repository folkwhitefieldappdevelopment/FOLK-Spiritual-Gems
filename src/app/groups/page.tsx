"use client";
import * as React from "react";
import { PlusCircle, Users as UsersIcon, User, UserCog, PhoneCall, Search, Filter, RefreshCw, UsersRound, Plus, Loader2 } from "lucide-react";
import type { Group, AppUser, Person, UserRole } from "@/lib/types";
import { useAppToast } from "@/contexts/toast-context";
import { getAllGroups, deleteGroup, getStaticGroups } from "@/services/groups-service";
import { getDynamicGroupCounts } from "@/services/people-service";
import { getEnablers, type EnablerOption } from "@/services/settings-service";
import { useAuth } from "@/contexts/auth-context";

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { ConfirmSessionDialog } from "@/components/confirm-session-dialog";
import { dynamicGroupDefinitions } from "@/lib/dynamic-groups";
import { GroupCardSkeleton } from "@/components/skeleton-loaders";
import { cn } from "@/lib/utils";
import { trackSessionStart } from "@/services/session-history-service";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function GroupsPage() {
  const { toast } = useAppToast();
  const { appUser } = useAuth();
  const router = useRouter();
  
  const [allStaticGroups, setAllStaticGroups] = React.useState<Group[]>([]);
  const [dynamicCounts, setDynamicCounts] = React.useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = React.useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | undefined>(undefined);

  const [viewFilter, setViewFilter] = React.useState('mine');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [enablerFilter, setEnablerFilter] = React.useState('all');
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);

  const [groupToCall, setGroupToCall] = React.useState<Group | null>(null);
  const [isConfirmSessionDialogOpen, setIsConfirmSessionDialogOpen] = React.useState(false);

  const fetchCounts = React.useCallback(async () => {
      if (!appUser?.id) return;
      setIsLoadingCounts(true);
      try {
        const counts = await getDynamicGroupCounts(
            { id: appUser.id, name: appUser.name, role: appUser.role }, 
            viewFilter
        );
        setDynamicCounts(counts);
      } finally {
        setIsLoadingCounts(false);
      }
  }, [appUser, viewFilter]);

  const fetchData = React.useCallback(async (refresh = false) => {
    if (!appUser?.id) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const userInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      const [groupsData, enablersData] = await Promise.all([
          getStaticGroups(userInfo),
          getEnablers(appUser, 'filter')
      ]);

      setAllStaticGroups(groupsData);
      setEnablerOptions(enablersData);

      // Await counts so isLoading doesn't finish early
      await fetchCounts();

    } catch (error) {
      console.error("Groups load failed", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [appUser, fetchCounts]);

  React.useEffect(() => { 
    if (appUser?.id) fetchData(); 
  }, [fetchData, appUser?.id]);

  const filteredGroups = React.useMemo(() => {
    if (!appUser) return [];

    const dynamicGroups: Group[] = dynamicGroupDefinitions.map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        peopleIds: [], 
        memberCount: dynamicCounts[def.id] || 0,
        isDynamic: true,
        color: def.color,
        createdBy: 'system',
        createdByName: 'System',
        creatorRole: ['Admin'],
        sharedWithUserIds: [],
        visibility: []
    }));

    const myNameLower = (appUser.name || '').toLowerCase();
    let result: Group[] = [];

    if (viewFilter === 'mine') {
      const mineStatic = allStaticGroups.filter(g => {
        const creatorNameLower = (g.createdByName || '').toLowerCase();
        return g.createdBy === appUser.id || 
               creatorNameLower === myNameLower ||
               (g.sharedWithUserIds && g.sharedWithUserIds.includes(appUser.id));
      });
      result = [...dynamicGroups, ...mineStatic];
    } else {
      const othersStatic = allStaticGroups.filter(g => {
        const creatorNameLower = (g.createdByName || '').toLowerCase();
        const isOwner = g.createdBy === appUser.id || 
                        creatorNameLower === myNameLower ||
                        (g.sharedWithUserIds && g.sharedWithUserIds.includes(appUser.id));
        
        const isVisibleByRole = g.visibility && g.visibility.some(role => appUser.role.includes(role));
        const isAdmin = appUser.role.includes('Admin');

        return !isOwner && (isVisibleByRole || isAdmin);
      });
      result = othersStatic;
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(g => g.name.toLowerCase().includes(lower));
    }

    return result;
  }, [allStaticGroups, dynamicCounts, appUser, viewFilter, searchTerm]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background relative">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader title="Groups" description="Manage outreach lists with precomputed stage intelligence.">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={isRefreshing || isLoading}>
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", (isRefreshing || isLoading) && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => { setEditingGroup(undefined); setIsDialogOpen(true); }} className="h-9 font-bold px-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </div>
        </PageHeader>

        <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-6">
          <div className="space-y-4">
            <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v)}>
              <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50 rounded-2xl gap-1">
                <TabsTrigger value="mine" className="py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">Groups (Mine)</TabsTrigger>
                <TabsTrigger value="all" className="py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">Groups (Shared)</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col md:flex-row items-center gap-3 p-3 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-border">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search list name..." className="pl-10 h-11 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {isLoadingCounts && !isLoading && (
                <div className="flex items-center gap-2 px-2 text-[9px] font-black uppercase text-primary animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Updating live counts...
                </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <GroupCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-24">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onEdit={() => { setEditingGroup(group); setIsDialogOpen(true); }}
                  onDelete={() => deleteGroup(group.id, appUser!).then(() => fetchData(true))}
                  onStartCall={() => { setGroupToCall(group); setIsConfirmSessionDialogOpen(true); }}
                  displayMemberCount={group.memberCount}
                />
              ))}
              {filteredGroups.length === 0 && (
                <div className="col-span-full py-24 text-center bg-muted/20 rounded-[2.5rem] border-2 border-dashed mx-4">
                  <UsersRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No groups found in this view</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <CreateUpdateGroupDialog isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} onSave={() => fetchData(true)} group={editingGroup} />
      <ConfirmSessionDialog isOpen={isConfirmSessionDialogOpen} setIsOpen={setIsConfirmSessionDialogOpen} onStartSession={(ev) => trackSessionStart({ name: ev, peopleIds: groupToCall?.peopleIds || [] }, appUser!).then(() => router.push('/session'))} singlePersonName={groupToCall?.name} totalCount={groupToCall?.memberCount} pausedSession={appUser?.pausedCallingSession} onResumeSession={() => router.push('/session')} />
    </div>
  );
}
