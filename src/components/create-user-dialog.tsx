
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Copy } from 'lucide-react';
import { userRoles, type AppUser, type UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { createUserAction } from '@/app/user-management/actions';


const userFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit Indian mobile number.' }),
  role: z.array(z.string()).min(1, { message: 'Please select at least one role.' }),
  fgCode: z.string().optional(),
  guideId: z.string().optional(),
}).refine(data => {
    if (data.role.includes('Folk Guide')) {
        return !!data.fgCode && data.fgCode.trim().length > 0;
    }
    return true;
}, {
    message: 'FG Code is required for Folk Guides.',
    path: ['fgCode'],
}).refine(data => {
    if (data.role.includes('Folk Enabler')) {
        return !!data.guideId;
    }
    return true;
}, {
    message: 'A Folk Guide must be assigned to an Enabler.',
    path: ['guideId'],
});

export type UserFormValues = z.infer<typeof userFormSchema>;

type CreateUserDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: UserFormValues, userId?: string) => Promise<void>;
  user?: AppUser;
  folkGuides: AppUser[];
  onUserCreated: () => void;
};

export function CreateUserDialog({ isOpen, setIsOpen, onSave, user, folkGuides, onUserCreated }: CreateUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [signInLink, setSignInLink] = React.useState<string | null>(null);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: [],
      fgCode: '',
      guideId: '',
    },
  });

  const selectedRoles = form.watch('role', user?.role || []);
  const isGuideSelected = selectedRoles.includes('Folk Guide');
  const isEnablerSelected = selectedRoles.includes('Folk Enabler');

  React.useEffect(() => {
    if (isOpen) {
      setSignInLink(null); 
      if (user) {
        form.reset({
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          fgCode: user.fgCode || '',
          guideId: user.reportsTo?.guideId || '',
        });
      } else {
        form.reset({
          name: '',
          email: '',
          phone: '',
          role: [],
          fgCode: '',
          guideId: '',
        });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, user, form]);

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    setSignInLink(null);
    try {
        if (user) {
            await onSave(data, user.id);
            setIsOpen(false);
        } else {
            const result = await createUserAction(data);
            if (result.success) {
                toast({
                    title: 'User Record Created',
                    description: `Record for ${data.name} saved.`,
                });
                setSignInLink(result.message);
                onUserCreated();
            } else {
                throw new Error(result.message);
            }
        }
    } catch (error) {
        console.error("Error in onSubmit:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: 'destructive',
            title: 'Error Saving User',
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) setSignInLink(null);
        setIsOpen(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {user
              ? "Update the user's details below."
              : 'Add a new user to the application. This will generate a sign-in link for you to send to them.'}
          </DialogDescription>
        </DialogHeader>
        {signInLink ? (
          <div className="space-y-4 py-4">
              <Alert variant="default">
                <AlertTitle>Sign-In Link Generated!</AlertTitle>
                <AlertDescription>
                    The user has been created. Please copy the link below and send it to them. They must click this link to set their password and gain access.
                </AlertDescription>
              </Alert>
              <div className="relative">
                <Input readOnly value={signInLink} className="pr-10" />
                <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => {
                        navigator.clipboard.writeText(signInLink);
                        toast({ title: "Copied to clipboard!" });
                    }}
                >
                    <Copy className="h-4 w-4" />
                </Button>
              </div>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
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
                    <Input type="email" placeholder="e.g., user@example.com" {...field} disabled={!!user} />
                  </FormControl>
                  {!!user && <FormDescription className="text-xs">Email cannot be changed after creation.</FormDescription>}
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
                  <FormLabel>Roles</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <div className="truncate">
                            {(field.value || []).length > 0 ? (field.value || []).join(', ') : 'Select roles'}
                          </div>
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                      {userRoles.map((roleOption) => (
                        <DropdownMenuCheckboxItem
                          key={roleOption}
                          checked={(field.value || []).includes(roleOption)}
                          onCheckedChange={(checked) => {
                            const currentRoles = field.value || [];
                            const newRoles = checked
                              ? [...currentRoles, roleOption]
                              : currentRoles.filter((r) => r !== roleOption);
                            field.onChange(newRoles);
                          }}
                        >
                          {roleOption}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isGuideSelected && (
                 <FormField
                    control={form.control}
                    name="fgCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>FG Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter a unique code for the Folk Guide" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {isEnablerSelected && (
                 <FormField
                    control={form.control}
                    name="guideId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assign to Folk Guide</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a Folk Guide" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {folkGuides.map(guide => (
                                        <SelectItem key={guide.id} value={guide.id}>
                                            {guide.name} ({guide.fgCode || 'N/A'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Save Changes' : 'Create User & Get Link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
