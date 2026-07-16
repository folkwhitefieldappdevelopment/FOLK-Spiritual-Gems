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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  User, 
  ChevronRight, 
  AlertCircle, 
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';
import type { Person, AppUser, SavedWhatsappQuestion } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { getUserById } from '@/services/user-service';
import { getSavedQuestions, upsertQuestion, generateWhatsappLink } from '@/services/whatsapp-service';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AskEnablerDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mode: 'single' | 'bulk';
  people: Person[];
};

export function AskEnablerDialog({ isOpen, setIsOpen, mode, people }: AskEnablerDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [questionText, setQuestionText] = React.useState('');
  const [savedQuestions, setSavedQuestions] = React.useState<SavedWhatsappQuestion[]>([]);
  const [enablersMap, setEnablersMap] = React.useState<Map<string, AppUser>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Group people by enabler
  const groups = React.useMemo(() => {
    const map = new Map<string, { name: string; contacts: Person[] }>();
    people.forEach(p => {
      const id = p.enablerId || 'unassigned';
      const name = p.enablerInTouchWith || 'Unassigned Enabler';
      if (!map.has(id)) map.set(id, { name, contacts: [] });
      map.get(id)!.contacts.push(p);
    });
    return Array.from(map.entries());
  }, [people]);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const fetchData = async () => {
        try {
          const [questions, ...enablerDocs] = await Promise.all([
            getSavedQuestions(),
            ...Array.from(new Set(people.map(p => p.enablerId).filter(Boolean))).map(id => getUserById(id!))
          ]);
          
          setSavedQuestions(questions);
          const eMap = new Map();
          enablerDocs.forEach(u => { if (u) eMap.set(u.id, u); });
          setEnablersMap(eMap);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, people]);

  const filteredSuggestions = React.useMemo(() => {
    if (!questionText) return savedQuestions.slice(0, 5);
    return savedQuestions
      .filter(q => q.text.toLowerCase().includes(questionText.toLowerCase()))
      .slice(0, 5);
  }, [questionText, savedQuestions]);

  const constructMessage = (enablerName: string, contacts: Person[]) => {
    const intro = contacts.length > 1 
      ? `Hi ${enablerName}, could you help with these contacts?`
      : `Hi ${enablerName}, could you help with this contact?`;

    const list = contacts.map((p, i) => 
      contacts.length > 1 ? `${i + 1}. ${p.fullName} — ${p.phone}` : `${p.fullName} — ${p.phone}`
    ).join('\n');

    return `${intro}\n\n${list}\n\n${questionText.trim()}`;
  };

  const handleSend = async (enablerId: string, enablerName: string, contacts: Person[]) => {
    if (!appUser) return;
    
    const enabler = enablersMap.get(enablerId);
    if (!enabler || !enabler.phone) {
      toast({ variant: 'destructive', title: "No Phone Number", description: `${enablerName} has no phone number on file.` });
      return;
    }

    const message = constructMessage(enablerName, contacts);
    const link = generateWhatsappLink(enabler.phone, message);
    
    window.open(link, '_blank');
    await upsertQuestion(questionText, appUser.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 pb-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/20">
                <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Ask Enabler on WhatsApp</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold text-xs uppercase tracking-widest">
                {mode === 'single' ? `Contact Inquiry` : `Batch Team Request`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-8 space-y-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Connecting Team Data...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 relative">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Question / Instructions</Label>
                    <Badge variant="outline" className="text-[8px] font-black text-primary border-primary/20 bg-primary/5 uppercase">Ranking by usage</Badge>
                  </div>
                  <div className="relative group">
                    <Input 
                      placeholder="e.g. Any update on his chanting rounds?" 
                      className="h-14 rounded-2xl bg-muted border-border font-bold px-5 focus-visible:ring-primary shadow-inner"
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-20" />
                  </div>

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredSuggestions.map((q, idx) => (
                        <button 
                          key={q.id}
                          className="w-full text-left px-5 py-3 hover:bg-muted transition-colors flex items-center justify-between group"
                          onClick={() => { setQuestionText(q.text); setShowSuggestions(false); }}
                        >
                          <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground">{q.text}</span>
                          <div className="flex items-center gap-2 opacity-40">
                             <Clock className="h-3 w-3" />
                             <span className="text-[8px] font-black">{q.usageCount} uses</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Targets & Previews</h4>
                  
                  {mode === 'single' ? (
                    <div className="space-y-4">
                        <div className="bg-muted p-6 rounded-3xl border border-border space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                        {groups[0]?.[1]?.name[0]}
                                    </div>
                                    <span className="text-sm font-black uppercase">{groups[0]?.[1]?.name}</span>
                                </div>
                                {!enablersMap.get(groups[0]?.[0])?.phone && (
                                    <Badge variant="destructive" className="font-black text-[9px] h-6 px-3">MISSING PHONE</Badge>
                                )}
                            </div>
                            <div className="bg-background rounded-2xl p-4 border border-border/50">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Message Preview</p>
                                <p className="text-xs text-foreground/80 font-bold whitespace-pre-wrap leading-relaxed italic">
                                    {constructMessage(groups[0]?.[1]?.name, people)}
                                </p>
                            </div>
                            <Button 
                                className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/20"
                                disabled={!questionText.trim() || !enablersMap.get(groups[0]?.[0])?.phone}
                                onClick={() => handleSend(groups[0]?.[0], groups[0]?.[1]?.name, people)}
                            >
                                <Send className="mr-2 h-4 w-4" /> Open WhatsApp Chat
                            </Button>
                        </div>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="space-y-3">
                        {groups.map(([id, group]) => {
                          const hasPhone = !!enablersMap.get(id)?.phone;
                          return (
                            <AccordionItem key={id} value={id} className="border-none">
                              <AccordionTrigger className="px-6 py-4 bg-muted/40 hover:bg-muted rounded-2xl transition-all border border-border data-[state=open]:rounded-b-none shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                    {group.name[0]}
                                  </div>
                                  <div className="text-left">
                                      <span className="text-xs font-black uppercase text-foreground">{group.name}</span>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{group.contacts.length} contacts</p>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="p-6 bg-muted/20 border border-t-0 border-border rounded-b-2xl space-y-4">
                                  {!hasPhone && (
                                      <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="text-[10px] font-black uppercase tracking-tight">Enabler phone number missing in user profile</span>
                                      </div>
                                  )}
                                  <div className="bg-background rounded-2xl p-4 border border-border/50">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Enabler Specific Preview</p>
                                      <p className="text-xs text-foreground/80 font-bold whitespace-pre-wrap italic">
                                          {constructMessage(group.name, group.contacts)}
                                      </p>
                                  </div>
                                  <Button 
                                      className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg"
                                      disabled={!questionText.trim() || !hasPhone}
                                      onClick={() => handleSend(id, group.name, group.contacts)}
                                  >
                                      <Send className="mr-2 h-4 w-4" /> Send to {group.name}
                                  </Button>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                    </Accordion>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-border bg-card shrink-0">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="w-full rounded-xl font-bold text-muted-foreground hover:text-foreground h-12">Close Modal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
