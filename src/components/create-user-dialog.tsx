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
import { Loader2 } from 'lucide-react';
import { userRoles, type AppUser, type UserRole } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { createUserAction } from '@/app/actions';

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
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableRoles, setAvailableRoles] = React.useState<UserRole[]>([]);
  
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
  const isCurrentUserGuide = appUser?.role.includes('Folk Guide');
  const isCurrentUserAdmin = appUser?.role.includes('Admin');

  React.useEffect(() => {
    if (isCurrentUserAdmin) {
      setAvailableRoles([...userRoles]);
    } else if (isCurrentUserGuide) {
      setAvailableRoles(['Folk Enabler']);
    }
  }, [isCurrentUserAdmin, isCurrentUserGuide]);

  React.useEffect(() => {
    if (isOpen) {
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
          role: isCurrentUserGuide ? ['Folk Enabler'] : [],
          fgCode: '',
          guideId: isCurrentUserGuide ? appUser?.id : '',
        });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, user, form, isCurrentUserGuide, appUser?.id]);

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
        if (!appUser) throw new Error("Not authenticated");
        
        const actorInfo: { id: string; name: string; role: UserRole[] } = {
          id: appUser.id,
          name: appUser.name,
          role: appUser.role,
        };

        if (user) { // Editing existing user
            await onSave(data, user.id);
        } else { // Creating new user
            const result = await createUserAction(data, actorInfo);
            if (result.success) {
                toast({
                    title: 'User Action Successful',
                    description: result.message,
                });
                onUserCreated(); // Re-fetch users on the main page
            } else {
                toast({
                    variant: 'destructive',
                    title: 'User Creation Failed',
                    description: result.message,
                    duration: 8000,
                });
            }
        }

        setIsOpen(false);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {user
              ? "Update the user's details below."
              : 'Add a new user to the application. This action might fail if the server environment is not configured correctly.'}
          </DialogDescription>
        </DialogHeader>
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
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isCurrentUserGuide && !user}>
                          <div className="truncate">
                            {field.value?.length ? field.value.join(', ') : 'Select roles'}
                          </div>
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                      {availableRoles.map((roleOption) => (
                        <DropdownMenuCheckboxItem
                          key={roleOption}
                          checked={field.value?.includes(roleOption)}
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
                  {isCurrentUserGuide && !user && (
                    <FormDescription className="text-xs">
                        Folk Guides can only create Folk Enablers.
                    </FormDescription>
                   )}
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
                            {isCurrentUserGuide && appUser ? (
                                <FormControl>
                                    <Input value={`${appUser.name} (${appUser.fgCode || 'N/A'})`} disabled />
                                </FormControl>
                            ) : (
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
                            )}
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
                {user ? 'Save Changes' : 'Save User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
