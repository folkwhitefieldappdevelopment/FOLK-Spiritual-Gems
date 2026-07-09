'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { callStatuses } from '@/lib/types';
import { Loader2, MessageSquare, ClipboardCheck, Calendar } from 'lucide-react';

const logSchema = z.object({
  outcome: z.string().min(1, "Please select an outcome."),
  notes: z.string().optional(),
  eventName: z.string().min(1, "Please enter an event name."),
});

interface DetailedLogCallDialogProps {
  onLogCall: (details: z.infer<typeof logSchema>) => void;
  trigger: React.ReactNode;
}

export function DetailedLogCallDialog({ onLogCall, trigger }: DetailedLogCallDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof logSchema>>({
    resolver: zodResolver(logSchema),
    defaultValues: { notes: '', outcome: '', eventName: '' },
  });

  const handleSubmit = async (values: z.infer<typeof logSchema>) => {
    setIsSubmitting(true);
    try {
        await onLogCall(values);
        setIsOpen(false);
        form.reset();
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>{trigger}</div>
      <DialogContent className="sm:max-w-md bg-[#1e1e2e] border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="bg-primary/10 p-3 rounded-2xl w-fit border border-primary/20">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Add Interaction Details</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-xs">
              Categorize this previous call and add any missing notes.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
            <FormField
              control={form.control}
              name="eventName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Event Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Sunday Feast, Personal Follow-up" 
                      className="h-12 rounded-xl border-white/5 bg-[#161623] text-white font-bold px-5 focus-visible:ring-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Call Outcome</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl border-white/5 bg-[#161623] text-white font-bold px-5">
                        <SelectValue placeholder="Select a call outcome..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                      {callStatuses.map(status => (
                        <SelectItem key={status} value={status} className="font-bold text-xs py-3">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Notes / Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter details about the conversation..." 
                      className="min-h-[120px] rounded-xl border-white/5 bg-[#161623] text-white font-bold p-4 resize-none focus-visible:ring-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-2 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold text-slate-400 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl font-black uppercase tracking-widest h-12 px-8 shadow-xl shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}