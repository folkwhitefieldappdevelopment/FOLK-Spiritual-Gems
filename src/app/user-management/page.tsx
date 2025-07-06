
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ShieldAlert } from 'lucide-react';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createUser } from '@/services/user-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const userFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit Indian mobile number.' }),
  role: z.enum(['Admin', 'User'], { required_error: 'Please select a role.' }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function CreateUserPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'User',
    },
  });

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      await createUser(data);
      toast({
        title: 'User Created & Invite Sent',
        description: `${data.name} has been added and a sign-up link has been sent to their email.`,
      });
      form.reset();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Error Creating User',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGuard adminOnly={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="User Management"
            description="Create and manage application users."
          />
          <main className="flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New User</CardTitle>
                  <CardDescription>
                    Fill out the form below to add a new user to the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="e.g., user@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save User
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Important Note on User Authentication</AlertTitle>
                <AlertDescription>
                  This form adds a user record and sends a sign-up link. The link allows them to sign in once. For subsequent logins, they will need to use the same email and a password. If they haven't set a password, they may need to use a 'Forgot Password' flow if one is implemented. To create a user with a password directly, you must manually add them in the{' '}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Firebase Console
                  </a> under the 'Authentication' section.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
