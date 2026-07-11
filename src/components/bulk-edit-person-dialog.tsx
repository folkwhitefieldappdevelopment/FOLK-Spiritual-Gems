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
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, Edit2, ShieldCheck, UserCheck, Briefcase, MapPin, Tag } from 'lucide-react';
import type { Person, FolkStage, AppUser, UserRole } from '@/lib/types';
import { 
  getEnablers, 
  getContactSources, 
  getOccupationStatuses, 
  getStayingWithOptions, 
  getCurrentFolkStages,
  type EnablerOption 
} from '@/services/settings-service';
import { getFolkGuides } from '@/services/user-service';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { bulkUpdatePeopleFields } from '@/services/people-service';
import { cn } from '@/lib/utils';

type BulkEditPersonDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
};

export function BulkEditPersonDialog({
  isOpen,
  setIsOpen,
  selectedIds,
  onSuccess,
}: BulkEditPersonDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(true);
  
  const [pendingChanges, setPendingChanges] = React.useState<Partial<Person>>({});
  
  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [sourceOptions, setSourceOptions] = React.useState<string[]>([]);
  const [occupationOptions, setOccupationOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [folkStages, setFolkStages] = React.useState<FolkStage[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);

  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  React.useEffect(() => {
    if (isOpen && appUser) {
      setIsLoadingOptions(true);
      setPendingChanges({});
      
      const loadOptions = async () => {
        try {
          const [enablers, sources, occupations, stayings, stages, guides] = await Promise.all([
            getEnablers(appUser, 'assignment'),
            getContactSources(),
            getOccupationStatuses(),
            getStayingWithOptions(),
            getCurrentFolkStages(),
            isPrivileged ? getFolkGuides() : Promise.resolve([])
          ]);
          
          setEnablerOptions(enablers);
          setSourceOptions(sources);
          setOccupationOptions(occupations);
          setStayingWithOptions(stayings);
          setFolkStages(stages as FolkStage[]);
          setFolkGuides(guides);
        } catch (e) {
          console.error("Failed to load options", e);
        } finally {
          setIsLoadingOptions(false);
        }
      };
      
      loadOptions();
    }
  }, [isOpen, appUser, isPrivileged]);

  const handleFieldChange = (key: keyof Person, value: any) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleEnablerChange = (value: string) => {
    if (value === '__CLEAR__') {
        handleFieldChange('enablerInTouchWith', '');
        handleFieldChange('enablerId', '');
    } else {
        const [name, id] = value.split('::');
        handleFieldChange('enablerInTouchWith', name);
        handleFieldChange('enablerId', id);
    }
  };

  const handleCoEnablerChange = (value: string) => {
    if (value === '__CLEAR__') {
        handleFieldChange('coEnablerName', '');
        handleFieldChange('coEnablerId', '');
    } else {
        const [name, id] = value.split('::');
        handleFieldChange('coEnablerName', name);
        handleFieldChange('coEnablerId', id);
    }
  };

  const handleGuideChange = (value: string) => {
    if (value === '__CLEAR__') {
        handleFieldChange('folkGuideId', '');
        handleFieldChange('folkGuide', '');
    } else {
        const guide = folkGuides.find(g => g.id === value);
        handleFieldChange('folkGuideId', value);
        handleFieldChange('folkGuide', guide ? `${guide.name} (${guide.fgCode})` : '');
    }
  };

  const toggleSource = (source: string) => {
    const current = (pendingChanges.contactSource || []) as string[];
    const next = current.includes(source) 
        ? current.filter(s => s !== source) 
        : [...current, source];
    handleFieldChange('contactSource', next);
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0 || !appUser) return;
    
    setIsSubmitting(true);
    try {
      await bulkUpdatePeopleFields(selectedIds, pendingChanges, { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ title: "Bulk Update Complete", description: `Updated ${selectedIds.length} contacts.` });
      onSuccess();
      setIsOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Update Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changedFieldsCount = Object.keys(pendingChanges).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] bg-popover border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                    <Edit2 className="h-6 w-6 text-primary" />
                    Bulk Field Editor
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold">
                    Applying changes to <span className="text-primary">{selectedIds.length}</span> selected records.
                </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-8 pt-4">
            {isLoadingOptions ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronizing Staging Schema...</p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {/* 1. Folk Stage */}
                <AccordionItem value="stage" className="border-none">
                  <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-xl"><MapPin className="h-4 w-4 text-primary" /></div>
                      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progress Staging</p><p className="text-sm font-black text-foreground uppercase">Current Folk Stage</p></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl">
                    <Select onValueChange={v => handleFieldChange('currentFolkStage', v)} value={pendingChanges.currentFolkStage || ''}>
                      <SelectTrigger className="h-12 rounded-xl bg-background border-border font-bold">
                        <SelectValue placeholder="No change..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {folkStages.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Enabler (Privileged) */}
                {isPrivileged && (
                  <AccordionItem value="enabler" className="border-none">
                    <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-xl"><UserCheck className="h-4 w-4 text-primary" /></div>
                        <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hierarchy</p><p className="text-sm font-black text-foreground uppercase">Primary Enabler</p></div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl">
                      <Select onValueChange={handleEnablerChange} value={pendingChanges.enablerId ? `${pendingChanges.enablerInTouchWith}::${pendingChanges.enablerId}` : ''}>
                        <SelectTrigger className="h-12 rounded-xl bg-background border-border font-bold">
                          <SelectValue placeholder="No change..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="__CLEAR__" className="text-destructive font-bold italic">Unassign / Clear Enabler</SelectItem>
                          {enablerOptions.filter(o => o.value !== '__UNASSIGNED__').map(o => (
                            <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* 3. Co-Enabler */}
                <AccordionItem value="co-enabler" className="border-none">
                  <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-xl"><UsersRound className="h-4 w-4 text-primary" /></div>
                      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Collaboration</p><p className="text-sm font-black text-foreground uppercase">Assign Co-Enabler</p></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl">
                    <Select onValueChange={handleCoEnablerChange} value={pendingChanges.coEnablerId ? `${pendingChanges.coEnablerName}::${pendingChanges.coEnablerId}` : ''}>
                      <SelectTrigger className="h-12 rounded-xl bg-background border-border font-bold">
                        <SelectValue placeholder="No change..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="__CLEAR__" className="text-destructive font-bold italic">Remove / Clear Co-Enabler</SelectItem>
                        {enablerOptions.filter(o => o.value !== '__UNASSIGNED__').map(o => (
                          <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Contact Source */}
                <AccordionItem value="source" className="border-none">
                  <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-xl"><Tag className="h-4 w-4 text-primary" /></div>
                      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provenance</p><p className="text-sm font-black text-foreground uppercase">Contact Sources</p></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sourceOptions.map(source => (
                        <div key={source} className="flex items-center space-x-3 p-3 rounded-xl bg-background border border-border shadow-sm cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => toggleSource(source)}>
                          <Checkbox checked={(pendingChanges.contactSource || []).includes(source)} onCheckedChange={() => {}} />
                          <Label className="text-xs font-bold leading-none cursor-pointer">{source}</Label>
                        </div>
                      ))}
                    </div>
                    {pendingChanges.contactSource && (
                        <div className="mt-4 pt-4 border-t border-border flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleFieldChange('contactSource', undefined)} className="text-[10px] font-black uppercase text-muted-foreground">Clear Change</Button>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Verification & Status */}
                <AccordionItem value="status" className="border-none">
                  <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-xl"><ShieldCheck className="h-4 w-4 text-primary" /></div>
                      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trust & Metadata</p><p className="text-sm font-black text-foreground uppercase">Verification & Verification</p></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verified By FG</Label>
                            <Select onValueChange={v => handleFieldChange('verifiedByFg', v)} value={pendingChanges.verifiedByFg || ''}>
                                <SelectTrigger className="bg-background border-border font-bold"><SelectValue placeholder="No change..." /></SelectTrigger>
                                <SelectContent className="bg-popover border-border"><SelectItem value="Yes" className="font-bold">Yes</SelectItem><SelectItem value="No" className="font-bold">No</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relationship</Label>
                            <Select onValueChange={v => handleFieldChange('relationshipStatus', v)} value={pendingChanges.relationshipStatus || ''}>
                                <SelectTrigger className="bg-background border-border font-bold"><SelectValue placeholder="No change..." /></SelectTrigger>
                                <SelectContent className="bg-popover border-border"><SelectItem value="Single" className="font-bold">Single</SelectItem><SelectItem value="Married" className="font-bold">Married</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 6. Background Details */}
                <AccordionItem value="background" className="border-none">
                  <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-xl"><Briefcase className="h-4 w-4 text-primary" /></div>
                      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Demographics</p><p className="text-sm font-black text-foreground uppercase">Occupation & Housing</p></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Occupation</Label>
                            <Select onValueChange={v => handleFieldChange('occupation', v)} value={pendingChanges.occupation || ''}>
                                <SelectTrigger className="bg-background border-border font-bold"><SelectValue placeholder="No change..." /></SelectTrigger>
                                <SelectContent className="bg-popover border-border">{occupationOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staying With</Label>
                            <Select onValueChange={v => handleFieldChange('stayingWith', v)} value={pendingChanges.stayingWith || ''}>
                                <SelectTrigger className="bg-background border-border font-bold"><SelectValue placeholder="No change..." /></SelectTrigger>
                                <SelectContent className="bg-popover border-border">{stayingWithOptions.map(o => <SelectItem key={o} value={o} className="font-bold">{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 7. Folk Guide (Privileged) */}
                {isAdmin && (
                  <AccordionItem value="guide" className="border-none">
                    <AccordionTrigger className="px-6 py-4 bg-muted/30 hover:bg-muted/50 rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-xl"><ShieldCheck className="h-4 w-4 text-primary" /></div>
                        <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team Management</p><p className="text-sm font-black text-foreground uppercase">Folk Guide Ownership</p></div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl">
                      <Select onValueChange={handleGuideChange} value={pendingChanges.folkGuideId || ''}>
                        <SelectTrigger className="h-12 rounded-xl bg-background border-border font-bold">
                          <SelectValue placeholder="No change..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="__CLEAR__" className="text-destructive font-bold italic">Unassign / Clear Guide</SelectItem>
                          {folkGuides.map(g => (
                            <SelectItem key={g.id} value={g.id} className="font-bold">{g.name} ({g.fgCode})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-border bg-card flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
                {changedFieldsCount > 0 ? (
                    <p className="text-sm font-black uppercase tracking-tight text-primary">
                        {changedFieldsCount} field{changedFieldsCount !== 1 ? 's' : ''} staged for update
                    </p>
                ) : (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Expand a section below to stage changes
                    </p>
                )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-none font-bold text-muted-foreground hover:text-foreground">Cancel</Button>
                <Button onClick={handleSave} disabled={isSubmitting || changedFieldsCount === 0} className="flex-1 sm:flex-none h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Apply Field Changes
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
