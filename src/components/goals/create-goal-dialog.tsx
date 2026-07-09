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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Target } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

const goalSchema = z.object({
  enablerId: z.string().min(1, 'Please select an enabler.'),
  title: z.string().min(2, 'Title is required.'),
  category: z.enum(['Trip Goal', 'Events'] as const),
  targetCount: z.coerce.number().min(1, 'Target must be at least 1.'),
  targetUnit: z.string().optional(),
  deadlineDate: z.string().min(1, 'Deadline is required.'),
  deadlineLabel: z.string().optional(),
  remark: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

type CreateGoalDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  enablers: AppUser[];
  onSave: (data: any) => Promise<void>;
};

export function CreateGoalDialog({ isOpen, setIsOpen, enablers, onSave }: CreateGoalDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      enablerId: '',
      title: '',
      category: 'Trip Goal',
      targetCount: 1,
      targetUnit: 'boys',
      deadlineDate: new Date().toISOString().split('T')[0],
      deadlineLabel: '',
      remark: '',
    },
  });

  const onSubmit = async (data: GoalFormValues) => {
    const enabler = enablers.find(e => e.id === data.enablerId);
    if (!enabler) return;

    setIsSubmitting(true);
    try {
        const finalData = {
            ...data,
            enablerName: enabler.name,
            folkGuideId: enabler.reportsTo?.guideId || '',
            deadlineDate: Timestamp.fromDate(new Date(data.deadlineDate)),
            achievedCount: 0,
        };
        await onSave(finalData);
        setIsOpen(false);
        form.reset();
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              Initialize New Goal
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-bold">Assign a mission target to a coordinator.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="enablerId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Assign Enabler</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted border-border font-bold"><SelectValue placeholder="Pick a name..." /></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover border-border">
                                    {enablers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Goal Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted border-border font-bold"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="Trip Goal">Trip Goal</SelectItem>
                                    <SelectItem value="Events">Events</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Goal Title</FormLabel>
                        <FormControl><Input placeholder="e.g. DD Hills Trip, Jagannath Puri" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="targetCount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Count</FormLabel>
                            <FormControl><Input type="number" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="targetUnit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Unit</FormLabel>
                            <FormControl><Input placeholder="e.g. boys, souls" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="deadlineDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Deadline Date</FormLabel>
                            <FormControl><Input type="date" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="deadlineLabel"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Label Override (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g. Oct 21st to 24th" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" /></FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Goal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
