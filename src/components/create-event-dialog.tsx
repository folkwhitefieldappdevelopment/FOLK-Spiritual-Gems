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
import { Loader2, Calendar, Target } from 'lucide-react';
import { checklistData } from '@/lib/data';
import type { ProgressCategoryName } from '@/lib/types';

const eventSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  date: z.string().min(1, 'Date is required.'),
  categoryName: z.string().optional(),
  statementIndex: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

type CreateEventDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
};

export function CreateEventDialog({ isOpen, setIsOpen, onSave }: CreateEventDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      date: new Date().toISOString().split('T')[0],
      categoryName: '',
      statementIndex: '',
    },
  });

  const selectedCategoryName = form.watch('categoryName');
  const availableStatements = React.useMemo(() => {
      const cat = checklistData.find(c => c.category === selectedCategoryName);
      return cat ? cat.items : [];
  }, [selectedCategoryName]);

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
        const finalData: any = {
            name: data.name,
            date: data.date,
        };

        if (data.categoryName && data.statementIndex) {
            finalData.linkInfo = {
                categoryName: data.categoryName as ProgressCategoryName,
                statementIndex: parseInt(data.statementIndex)
            };
        }

        await onSave(finalData);
        setIsOpen(false);
        form.reset();
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Create Event Instance
          </DialogTitle>
          <DialogDescription>
            Add a specific session date for this group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Sunday Feast Session" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                    <Target className="h-4 w-4" />
                    Progress Linking (Optional)
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                    Attendance will automatically increment the selected progress item for every participant.
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                    <FormField
                        control={form.control}
                        name="categoryName"
                        render={({ field }) => (
                            <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Progress Category" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {checklistData.map(c => <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />

                    {selectedCategoryName && (
                        <FormField
                            control={form.control}
                            name="statementIndex"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Statement" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableStatements.map((item, idx) => (
                                                <SelectItem key={idx} value={String(idx)}>{item.question}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black px-8">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
