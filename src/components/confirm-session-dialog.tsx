
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getPeople } from '@/services/people-service';

const createFormSchema = (max: number) => z.object({
  eventName: z.string().min(1, 'Event name is required.'),
  startIndex: z.coerce.number().min(1, "Start index must be at least 1.").max(max > 0 ? max : 1, `Start index cannot be more than ${max}.`),
  endIndex: z.coerce.number().min(1, "End index must be at least 1.").max(max > 0 ? max : 1, `End index cannot be more than ${max}.`),
}).refine(data => data.endIndex >= data.startIndex, {
  message: 'End index must be greater than or equal to start index.',
  path: ['endIndex'],
});

type ConfirmSessionDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalCount: number;
  onStartSession: (eventName: string, startIndex: number, endIndex: number) => void;
  searchTerm: string;
};

export function ConfirmSessionDialog({ isOpen, setIsOpen, totalCount, onStartSession, searchTerm }: ConfirmSessionDialogProps) {
  const { appUser } = useAuth();
  
  const formSchema = createFormSchema(totalCount);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
      startIndex: 1,
      endIndex: totalCount,
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        eventName: appUser?.currentCallingEvent || '',
        startIndex: 1,
        endIndex: totalCount,
      });
    }
  }, [isOpen, totalCount, form, appUser]);
  
  const onSubmit = (data: FormValues) => {
    onStartSession(data.eventName, data.startIndex, data.endIndex);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Calling Event</DialogTitle>
          <DialogDescription>
            Confirm the event and optionally specify a range of contacts to call from your current filtered list of {totalCount} contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="eventName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunday Feast, Janmashtami" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
               <FormField
                  control={form.control}
                  name="startIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calling Range</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="pt-8 text-muted-foreground">to</span>
                 <FormField
                  control={form.control}
                  name="endIndex"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel>&nbsp;</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </div>
             <FormMessage>{form.formState.errors.startIndex?.message || form.formState.errors.endIndex?.message}</FormMessage>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit">Start Session</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
