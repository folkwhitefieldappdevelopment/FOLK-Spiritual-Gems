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
import { Loader2, Pencil } from 'lucide-react';
import type { AppUser, Goal } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { safeDate } from '@/utils/date';
import { format } from 'date-fns';
import { getGoalCategories, addGoalCategory, getGoalTitles, addGoalTitle, getGoalLabels, addGoalLabel } from '@/services/settings-service';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';

const goalSchema = z.object({
  enablerId: z.string().min(1, 'Please select an enabler.'),
  title: z.string().min(2, 'Title is required.'),
  category: z.string().min(1, 'Category is required.'),
  targetCount: z.coerce.number().min(1, 'Target must be at least 1.'),
  targetUnit: z.string().optional(),
  deadlineDate: z.string().min(1, 'Deadline is required.'),
  deadlineLabel: z.string().optional(),
  remark: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

type EditGoalDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  goal: Goal | null;
  enablers: AppUser[];
  onSave: (goalId: string, data: any) => Promise<void>;
};

export function EditGoalDialog({ isOpen, setIsOpen, goal, enablers, onSave }: EditGoalDialogProps) {
  const { appUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [titles, setTitles] = React.useState<string[]>([]);
  const [labels, setLabels] = React.useState<string[]>([]);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      enablerId: '',
      title: '',
      category: '',
      targetCount: 1,
      targetUnit: 'boys',
      deadlineDate: '',
      deadlineLabel: '',
      remark: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        Promise.all([
            getGoalCategories(),
            getGoalTitles(),
            getGoalLabels()
        ]).then(([cats, tits, labs]) => {
            setCategories(cats);
            setTitles(tits);
            setLabels(labs);
        });

        if (goal) {
            const deadline = safeDate(goal.deadlineDate);
            form.reset({
                enablerId: goal.enablerId,
                title: goal.title,
                category: goal.category,
                targetCount: goal.targetCount,
                targetUnit: goal.targetUnit || 'boys',
                deadlineDate: deadline ? format(deadline, 'yyyy-MM-dd') : '',
                deadlineLabel: goal.deadlineLabel || '',
                remark: goal.remark || '',
            });
        }
    }
  }, [isOpen, goal, form]);

  const onSubmit = async (data: GoalFormValues) => {
    if (!goal) return;
    const enabler = enablers.find(e => e.id === data.enablerId);
    if (!enabler) return;

    setIsSubmitting(true);
    try {
        const finalData = {
            ...data,
            enablerName: enabler.name,
            folkGuideId: enabler.reportsTo?.guideId || '',
            deadlineDate: Timestamp.fromDate(new Date(data.deadlineDate)),
        };

        // Persist suggestions
        await Promise.all([
            addGoalCategory(data.category, appUser || undefined),
            addGoalTitle(data.title, appUser || undefined),
            data.deadlineLabel ? addGoalLabel(data.deadlineLabel, appUser || undefined) : Promise.resolve()
        ]);

        await onSave(goal.id, finalData);
        setIsOpen(false);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <Pencil className="h-6 w-6 text-primary" />
              Adjust Goal Metadata
          </DialogTitle>
          <DialogDescription className="font-bold">Modify targets or deadlines for this mission.</DialogDescription>
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
                            <FormControl>
                                <AutocompleteInput 
                                    placeholder="Search or type category..." 
                                    value={field.value}
                                    onChange={field.onChange}
                                    suggestions={categories}
                                />
                            </FormControl>
                            <div className="px-1 pt-1">
                                <Button asChild variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase text-primary/60 hover:text-primary">
                                    <Link href="/settings">Manage Categories...</Link>
                                </Button>
                            </div>
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
                        <FormControl>
                            <AutocompleteInput 
                                placeholder="e.g. DD Hills Trip" 
                                value={field.value}
                                onChange={field.onChange}
                                suggestions={titles}
                            />
                        </FormControl>
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
                            <FormControl>
                                <AutocompleteInput 
                                    placeholder="e.g. Oct 21st to 24th" 
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    suggestions={labels}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Metadata
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
