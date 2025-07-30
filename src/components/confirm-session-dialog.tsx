
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
import type { Person } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const createFormSchema = (max: number) => z.object({
  eventName: z.string().min(1, 'Event name is required.'),
  startIndex: z.coerce.number().min(1, "Start index must be at least 1.").max(max, `Start index cannot be more than ${max}.`),
  endIndex: z.coerce.number().min(1, "End index must be at least 1.").max(max, `End index cannot be more than ${max}.`),
}).refine(data => data.endIndex >= data.startIndex, {
  message: 'End index must be greater than or equal to start index.',
  path: ['endIndex'],
});

type ConfirmSessionDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  people: Person[];
  onStartSession: (eventName: string, startIndex: number, endIndex: number) => void;
};

export function ConfirmSessionDialog({ isOpen, setIsOpen, people, onStartSession }: ConfirmSessionDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const formSchema = createFormSchema(people.length);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: appUser?.currentCallingEvent || '',
      startIndex: 1,
      endIndex: people.length,
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        eventName: appUser?.currentCallingEvent || '',
        startIndex: 1,
        endIndex: people.length,
      });
    }
  }, [isOpen, people.length, form, appUser]);
  
  const onSubmit = (data: FormValues) => {
    onStartSession(data.eventName, data.startIndex, data.endIndex);
  };

  const startIndex = form.watch('startIndex');
  const endIndex = form.watch('endIndex');

  const startPerson = people[startIndex - 1]?.fullName;
  const endPerson = people[endIndex - 1]?.fullName;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Calling Event</DialogTitle>
          <DialogDescription>
            Confirm the event and optionally specify a range of contacts to call.
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

            {people.length > 0 && (
                <Alert variant="default" className="text-sm">
                    <AlertDescription>
                        Select a range from your filtered list of {people.length} contacts.
                        {startPerson && <p className="mt-2"><strong>From:</strong> {startIndex}. {startPerson}</p>}
                        {endPerson && <p><strong>To:</strong> {endIndex}. {endPerson}</p>}
                    </AlertDescription>
                </Alert>
            )}

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
