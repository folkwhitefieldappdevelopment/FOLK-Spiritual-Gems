'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { PlayCircle, RotateCcw, ArrowRight, ChevronRight, History } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AutocompleteInput } from './ui/autocomplete-input';
import { getEventNames, addEventName } from '@/services/settings-service';

const createFormSchema = () => z.object({
  eventName: z.string().min(1, 'Event name is required.'),
});

type ConfirmSessionDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalCount?: number;
  onStartSession: (eventName: string, historyId?: string) => void;
  onResumeSession?: () => void;
  singlePersonName?: string | null;
  peopleIds?: string[];
  assignedById?: string;
  assignedByName?: string;
  pausedSession?: { event: string; peopleIds: string[]; currentIndex: number } | null;
};

export function ConfirmSessionDialog({ 
  isOpen, 
  setIsOpen, 
  totalCount, 
  onStartSession, 
  onResumeSession,
  singlePersonName,
  peopleIds,
  assignedById,
  assignedByName,
  pausedSession
}: ConfirmSessionDialogProps) {
  const { appUser } = useAuth();
  const [mode, setMode] = React.useState<'choice' | 'new'>(pausedSession ? 'choice' : 'new');
  const [isStarting, setIsStarting] = React.useState(false);
  const [eventSuggestions, setEventSuggestions] = React.useState<string[]>([]);

  const formSchema = React.useMemo(() => createFormSchema(), []);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({ eventName: '' });
      setMode(pausedSession ? 'choice' : 'new');
      setIsStarting(false);
      getEventNames().then(setEventSuggestions);
    }
  }, [isOpen, form, pausedSession]);
  
  const onSubmit = async (data: FormValues) => {
    setIsStarting(true);
    try {
      await addEventName(data.eventName, appUser || undefined);
      onStartSession(data.eventName);
    } finally {
      setIsStarting(false);
    }
  };
  
  if (mode === 'choice' && pausedSession) {
    const progress = Math.round(((pausedSession.currentIndex) / Math.max(1, pausedSession.peopleIds.length)) * 100);

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Active Session Found
            </DialogTitle>
            <DialogDescription className="pt-1">
              You were previously calling for <strong className="text-foreground">{pausedSession.event}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-3">
            <Button 
              onClick={() => onResumeSession?.()} 
              className="w-full h-auto p-4 flex items-center justify-between group transition-all border-2 border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/10 text-foreground text-left rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary p-2.5 rounded-full text-white shadow-lg shadow-primary/20">
                    <PlayCircle className="h-6 w-6" />
                </div>
                <div>
                    <div className="font-black text-sm uppercase tracking-tight">Resume Session</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                        On Contact {pausedSession.currentIndex + 1} • {progress}% Done
                    </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100 transition-opacity" />
            </Button>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-muted-foreground"><span className="bg-background px-2">Or</span></div>
            </div>

            <Button 
              onClick={() => setMode('new')} 
              variant="outline"
              className="w-full h-auto p-4 flex items-center justify-between group transition-all border-dashed hover:border-solid rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2.5 rounded-full text-muted-foreground">
                    <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                    <div className="font-bold text-sm">Start New Outreach</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Initialize a fresh calling list</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="w-full font-bold text-muted-foreground">
                Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Call Event Name</DialogTitle>
          <DialogDescription className="text-xs">
            {singlePersonName ? `Start a call for '${singlePersonName}'.` : `Start a calling session for ${totalCount || 0} contacts.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What is the occasion?</FormLabel>
                  <FormControl>
                    <AutocompleteInput 
                      placeholder="e.g. Sunday Feast, Janmashtami Invite" 
                      value={field.value}
                      onChange={field.onChange}
                      suggestions={eventSuggestions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" type="button" onClick={() => setIsOpen(false)} className="flex-1 font-bold">Cancel</Button>
                <Button type="submit" className="flex-1 h-11 font-black uppercase tracking-tight text-xs" disabled={isStarting}>
                  {isStarting ? 'Preparing...' : 'Start Session'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
