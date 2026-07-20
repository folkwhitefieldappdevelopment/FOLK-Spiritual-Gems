'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Calendar,
  User,
  ArrowRight,
  Merge,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import type { Person } from '@/lib/types';
import { findDuplicateContacts, mergeContacts } from '@/services/people-service';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { format } from 'date-fns';
import { safeDate } from '@/utils/date';
import { cn } from '@/lib/utils';

type DuplicateContactsDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function DuplicateContactsDialog({ isOpen, setIsOpen, onSuccess }: DuplicateContactsDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMerging, setIsMerging] = React.useState(false);
  const [duplicateGroups, setDuplicateGroups] = React.useState<Person[][]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [keepId, setKeepId] = React.useState<string>('');

  const loadDuplicates = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await findDuplicateContacts();
      const groups = Object.values(results);
      setDuplicateGroups(groups);
      
      if (groups.length > 0) {
        autoSelectTarget(groups[0]);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Scan Failed' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const autoSelectTarget = (group: Person[]) => {
    // Prioritize by: completeness (history count) then age
    const sorted = [...group].sort((a, b) => {
      const scoreA = (a.callHistory?.length || 0) + (a.attendanceHistory?.length || 0);
      const scoreB = (b.callHistory?.length || 0) + (b.attendanceHistory?.length || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      const dateA = safeDate(a.createdAt)?.getTime() || 0;
      const dateB = safeDate(b.createdAt)?.getTime() || 0;
      return dateA - dateB; // Keep oldest
    });
    setKeepId(sorted[0].id);
  };

  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      loadDuplicates();
    }
  }, [isOpen, loadDuplicates]);

  const handleNextGroup = () => {
    if (currentIndex < duplicateGroups.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      autoSelectTarget(duplicateGroups[nextIdx]);
    } else {
      setIsOpen(false);
    }
  };

  const handleMerge = async () => {
    if (!appUser || !keepId) return;
    const currentGroup = duplicateGroups[currentIndex];
    const discardIds = currentGroup.filter(p => p.id !== keepId).map(p => p.id);

    setIsMerging(true);
    try {
      await mergeContacts(keepId, discardIds, { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ title: 'Records Merged Successfully' });
      
      // Remove handled group and adjust state
      const nextGroups = duplicateGroups.filter((_, i) => i !== currentIndex);
      setDuplicateGroups(nextGroups);
      
      if (nextGroups.length === 0) {
        setIsOpen(false);
        onSuccess();
      } else {
        // Stay at same index (which is now the next group) or move back if we were at the end
        const nextIdx = Math.min(currentIndex, nextGroups.length - 1);
        setCurrentIndex(nextIdx);
        autoSelectTarget(nextGroups[nextIdx]);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Merge Failed' });
    } finally {
      setIsMerging(false);
    }
  };

  const currentGroup = duplicateGroups[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 pb-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                <Merge className="h-6 w-6 text-primary" />
                Deduplication Wizard
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold">
                {isLoading ? 'Scanning mission database...' : `Identified ${duplicateGroups.length} duplicate phone conflicts.`}
              </DialogDescription>
            </div>
            {!isLoading && duplicateGroups.length > 0 && (
              <Badge className="bg-primary/10 text-primary border-none font-black h-7 px-4 rounded-full">
                Conflict {currentIndex + 1} / {duplicateGroups.length}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Analyzing Phone Registry...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 p-12 text-center">
              <div className="bg-green-500/10 p-8 rounded-[3rem] border border-green-500/20 shadow-inner">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Database is Clean</h3>
                <p className="text-muted-foreground font-bold max-w-xs mx-auto">No redundant contact records found with identical phone numbers.</p>
              </div>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-xl px-10 h-12 font-black uppercase tracking-widest text-[10px]">Close Wizard</Button>
            </div>
          ) : (
            <div className="h-full flex flex-col p-8 gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentGroup.map((person) => {
                      const isTarget = keepId === person.id;
                      const createdAt = safeDate(person.createdAt);
                      
                      return (
                        <Card 
                          key={person.id}
                          className={cn(
                            "relative overflow-hidden transition-all duration-300 border-2 rounded-[2rem] cursor-pointer group",
                            isTarget ? "bg-primary/5 border-primary shadow-xl" : "bg-muted/30 border-border hover:bg-muted/50"
                          )}
                          onClick={() => setKeepId(person.id)}
                        >
                          {isTarget && (
                            <div className="absolute top-0 right-0 p-4">
                                <Badge className="bg-primary text-white font-black text-[8px] uppercase px-3 py-1 shadow-lg">TARGET TO KEEP</Badge>
                            </div>
                          )}
                          <div className="p-8 space-y-6">
                            <div className="flex items-center gap-5">
                              <Avatar className="h-16 w-16 border-2 border-border shadow-md">
                                <AvatarImage src={person.photoUrl} className="object-cover" />
                                <AvatarFallback className="bg-muted font-black">{person.fullName[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <h4 className="font-black text-lg uppercase truncate leading-none mb-2">{person.fullName}</h4>
                                <p className="text-xs font-black text-primary tracking-widest">{person.phone}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <StatItem icon={Calendar} label="Created" value={createdAt ? format(createdAt, 'dd MMM yyyy') : 'N/A'} />
                              <StatItem icon={User} label="Enabler" value={person.enablerInTouchWith || 'Unassigned'} />
                              <StatItem icon={History} label="Calls" value={`${person.callHistory?.length || 0} logs`} />
                              <StatItem icon={CheckCircle2} label="Events" value={`${person.attendanceHistory?.length || 0} times`} />
                            </div>

                            <div className="pt-4 space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Staging</p>
                                <Badge variant="outline" className="h-7 px-3 border-border bg-background font-bold text-[10px]">{person.currentFolkStage}</Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>

                <div className="mt-auto bg-muted/50 p-6 rounded-3xl border border-border flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed text-muted-foreground">
                    <span className="text-foreground uppercase font-black">Merging Intelligence:</span> All call logs and attendance history from discarded records will be appended to the target contact. Any empty fields in the target profile will be backfilled from the duplicates.
                  </p>
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-card border-t border-border shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-10 w-10 rounded-xl"
                 onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                 disabled={currentIndex === 0 || duplicateGroups.length === 0}
               >
                 <ChevronLeft className="h-5 w-5" />
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-10 w-10 rounded-xl"
                 onClick={handleNextGroup}
                 disabled={currentIndex === duplicateGroups.length - 1 || duplicateGroups.length === 0}
               >
                 <ChevronRight className="h-5 w-5" />
               </Button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold flex-1 sm:flex-none">Cancel</Button>
              <Button 
                onClick={handleMerge} 
                disabled={isMerging || duplicateGroups.length === 0}
                className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 flex-1 sm:flex-none"
              >
                {isMerging ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing Merge...</> : <><Merge className="mr-2 h-4 w-4" /> Merge Records</>}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 opacity-50">
        <Icon className="h-2.5 w-2.5" />
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[10px] font-black uppercase text-foreground truncate">{value}</p>
    </div>
  );
}

function Card({ className, children, onClick }: { className?: string, children: React.ReactNode, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}
