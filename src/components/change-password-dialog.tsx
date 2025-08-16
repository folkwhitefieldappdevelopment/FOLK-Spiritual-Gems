
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { changePasswordAction } from '@/app/user-management/actions';
import { useAuth } from '@/contexts/auth-context';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type ChangePasswordDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export function ChangePasswordDialog({ isOpen, setIsOpen }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (!user || !user.email) return;

    setIsSubmitting(true);
    try {
        // First, re-authenticate the user with their current password.
        const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
        await reauthenticateWithCredential(user, credential);

        // If re-authentication is successful, then proceed to change the password.
        const result = await changePasswordAction({ newPassword: data.newPassword });

        if (result.success) {
            toast({
                title: 'Success',
                description: result.message,
            });
            setIsOpen(false);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Password change failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: 'destructive',
            title: 'Error',
            description: errorMessage.includes('auth/invalid-credential') ? 'The current password you entered is incorrect.' : errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new password below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
