'use client';

import * as React from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  UserPlus, 
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { 
  createTeam, 
  renameTeam, 
  deleteTeam, 
  getTeamsForGuide, 
  getAllTeams,
  assignEnablerToTeam,
  removeEnablerFromTeam
} from '@/services/team-service';
import { getAssignableUsersForAssignments } from '@/services/user-service';
import type { Team, AppUser } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function TeamsPage() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [enablers, setEnablers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);

  const isAdmin = appUser?.role.includes('Admin');

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      const [teamsData, enablersData] = await Promise.all([
        isAdmin ? getAllTeams() : getTeamsForGuide(appUser.id),
        getAssignableUsersForAssignments(appUser)
      ]);
      setTeams(teamsData);
      setEnablers(enablersData);
    } catch (e) {
      toast({ variant: 'destructive', title: "Sync Failed" });
    } finally {
      setIsLoading(false);
    }
  }, [appUser, isAdmin, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!newTeamName.trim() || !appUser) return;
    setIsProcessing(true);
    try {
      await createTeam(newTeamName, appUser.id, { id: appUser.id, name: appUser.name });
      toast({ title: "Team Created" });
      setNewTeamName('');
      setIsCreateOpen(false);
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to create team" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async () => {
    if (!editingTeam || !newTeamName.trim() || !appUser) return;
    setIsProcessing(true);
    try {
      await renameTeam(editingTeam.id, newTeamName, { id: appUser.id, name: appUser.name });
      toast({ title: "Team Renamed" });
      setEditingTeam(null);
      setIsRenameOpen(false);
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to rename" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!appUser) return;
    try {
      await deleteTeam(id, { id: appUser.id, name: appUser.name });
      toast({ title: "Team Removed" });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to delete" });
    }
  };

  const handleAssign = async (enablerId: string, teamId: string, teamName: string) => {
    if (!appUser) return;
    try {
      await assignEnablerToTeam(enablerId, teamId, teamName, { id: appUser.id, name: appUser.name });
      toast({ title: "Member Assigned" });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Assignment failed" });
    }
  };

  const handleRemove = async (enablerId: string) => {
    try {
      await removeEnablerFromTeam(enablerId);
      toast({ title: "Member Removed" });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Removal failed" });
    }
  };

  return (
    <>
      <PageHeader title="Outreach Teams" description="Group your coordinators for better mission reporting.">
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-9">
          <Plus className="h-4 w-4 mr-2" /> New Team
        </Button>
      </PageHeader>

      <main className="flex-1 p-4 sm:p-6 sm:pt-0 space-y-8 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest mt-4">Querying Teams...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Registered Teams ({teams.length})</h3>
              {teams.map(team => {
                const members = enablers.filter(e => e.team?.teamId === team.id);
                return (
                  <Card key={team.id} className="bg-popover border-none rounded-[2rem] shadow-xl overflow-hidden group">
                    <CardHeader className="p-6 pb-4 bg-card border-b border-border flex flex-row items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground">{team.name}</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{members.length} Members</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTeam(team); setNewTeamName(team.name); setIsRenameOpen(true); }} className="h-8 w-8 rounded-lg"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border group/member">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border-2 border-primary/10 shadow-sm"><AvatarImage src={m.photoUrl}/><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                              <span className="text-sm font-bold uppercase text-foreground/80">{m.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)} className="h-7 w-7 opacity-0 group-member/hover:opacity-100"><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        {members.length === 0 && <p className="text-center py-6 text-[10px] font-bold text-muted-foreground uppercase italic opacity-40">No members assigned</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {teams.length === 0 && (
                <div className="py-20 text-center bg-muted/20 border-2 border-dashed border-border rounded-[2.5rem] px-10">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Start by creating your first team</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Enabler Roster</h3>
              <Card className="bg-popover border-none rounded-[2.5rem] shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border">
                        <TableHead className="pl-6 text-[10px] font-black uppercase">Staff Member</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Current Team</TableHead>
                        <TableHead className="text-right pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enablers.map(enabler => (
                        <TableRow key={enabler.id} className="border-border hover:bg-muted/30 h-16 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-primary/20"><AvatarImage src={enabler.photoUrl}/><AvatarFallback>{enabler.name[0]}</AvatarFallback></Avatar>
                              <span className="font-bold text-xs uppercase text-foreground">{enabler.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {enabler.team ? (
                              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] h-6 px-3">{enabler.team.teamName}</Badge>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Select 
                              value={enabler.team?.teamId || "unassigned"} 
                              onValueChange={(val) => {
                                if (val === "unassigned") handleRemove(enabler.id);
                                else {
                                  const t = teams.find(x => x.id === val);
                                  if (t) handleAssign(enabler.id, t.id, t.name);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 w-32 rounded-xl bg-muted/50 border-border text-[10px] font-black uppercase tracking-widest"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="unassigned" className="text-[10px] font-bold uppercase">No Team</SelectItem>
                                {teams.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Create Team 👥</DialogTitle>
            <DialogDescription className="font-bold">Enter a name for the new outreach group.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Team Name</Label>
            <Input 
              value={newTeamName} 
              onChange={e => setNewTeamName(e.target.value)} 
              className="h-14 mt-2 rounded-xl bg-muted border-border font-bold px-5 text-lg" 
              placeholder="e.g. South Bangalore Alpha"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleCreate} disabled={isProcessing || !newTeamName.trim()} className="rounded-xl font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Team ✏️</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rename Team</Label>
            <Input 
              value={newTeamName} 
              onChange={e => setNewTeamName(e.target.value)} 
              className="h-14 mt-2 rounded-xl bg-muted border-border font-bold px-5 text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleRename} disabled={isProcessing || !newTeamName.trim()} className="rounded-xl font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
