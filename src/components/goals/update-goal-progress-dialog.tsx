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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Activity, Pencil } from 'lucide-react';
import type { Goal } from '@/lib/types';

const updateSchema = z.object({
  achievedCount: z.coerce.number().min(0, 'Must be at least 0.'),
  remark: z.string().optional(),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

type UpdateGoalProgressDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  goal: Goal | null;
  onSave: (achievedCount: number, remark?: string) => Promise<void>;
};

export function UpdateGoalProgressDialog({ isOpen, setIsOpen, goal, onSave }: UpdateGoalProgressDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      achievedCount: 0,
      remark: '',
    },
  });

  React.useEffect(() => {
    if (isOpen && goal) {
      form.reset({
        achievedCount: goal.achievedCount,
        remark: goal.remark || '',
      });
    }
  }, [isOpen, goal, form]);

  const onSubmit = async (data: UpdateFormValues) => {
    setIsSubmitting(true);
    try {
        await onSave(data.achievedCount, data.remark);
        setIsOpen(false);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <div className="bg-primary/10 p-3 rounded-2xl w-fit border border-primary/20 mb-3">
              <Activity className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Update Milestone</DialogTitle>
          <DialogDescription className="font-bold">
              Recording progress for: <span className="text-primary">{goal.title}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <FormField
                control={form.control}
                name="achievedCount"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Current Achievement</FormLabel>
                        <div className="relative">
                            <FormControl>
                                <Input type="number" {...field} className="h-16 text-3xl font-black rounded-xl bg-muted border-border px-6 focus-visible:ring-primary" />
                            </FormControl>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-black uppercase text-xs tracking-widest">
                                of {goal.targetCount} {goal.targetUnit || 'Souls'}
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2">
                            <Pencil className="h-3 w-3" /> Recent Context / Remarks
                        </FormLabel>
                        <FormControl>
                            <Textarea placeholder="How's it going? Any updates?" className="min-h-[100px] rounded-xl bg-muted border-border font-bold p-4 resize-none" {...field} />
                        </FormControl>
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-2 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-10 font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Progress
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
