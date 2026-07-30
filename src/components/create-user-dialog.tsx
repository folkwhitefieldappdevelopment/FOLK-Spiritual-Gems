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
  FormDescription,
} from './ui/form';
import { Input } from './ui/input';
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
import { Loader2, ShieldCheck } from 'lucide-react';
import { userRoles, type AppUser, type UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { provisionUserOnServer } from '@/services/user-service';
import { useAuth } from '@/contexts/auth-context';

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
  onUpdate: (data: UserFormValues, userId: string) => Promise<void>;
  user?: AppUser;
  folkGuides: AppUser[];
  onUserCreated: () => void;
};

export function CreateUserDialog({ isOpen, setIsOpen, onUpdate, user, folkGuides, onUserCreated }: CreateUserDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
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
    if (!appUser) return;
    setIsSubmitting(true);
    try {
        if (user) {
            await onUpdate(data, user.id);
        } else {
            // provision user using server-side logic
            await provisionUserOnServer({
                name: data.name,
                email: data.email,
                phone: data.phone,
                role: data.role as UserRole[],
                fgCode: data.fgCode,
                guideId: data.guideId
            });
            
            toast({
                title: 'User Provisioned',
                description: `Auth account created for ${data.name}. A welcome email has been sent.`,
            });
            onUserCreated();
            setIsOpen(false);
        }
    } catch (error: any) {
        console.error("User creation error:", error);
        toast({
            variant: 'destructive',
            title: 'Provisioning Failed',
            description: error.message || 'Failed to create user account.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-popover border-none shadow-2xl max-w-lg">
        <DialogHeader className="p-8 pb-4 bg-card border-b border-border">
          <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
             <ShieldCheck className="h-6 w-6 text-primary" />
             {user ? 'Update Profile' : 'Provision User'}
          </DialogTitle>
          <DialogDescription className="font-bold">
            {user
              ? "Modify the existing user's credentials and role."
              : 'Create a new Firebase Auth account and database record.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Rahul Dev" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. user@example.com" {...field} disabled={!!user} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit mobile" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
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
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">System Roles</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full h-12 justify-between font-bold rounded-xl border-border bg-muted px-4">
                            <span className="truncate">{(field.value || []).join(', ') || 'Select roles...'}</span>
                            <Loader2 className="h-4 w-4 opacity-30" />
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
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Folk Guide Code</FormLabel>
                          <FormControl>
                              <Input placeholder="Enter unique ID (e.g. FG01)" {...field} className="h-12 rounded-xl bg-muted border-border font-bold px-4" />
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
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Reporting Folk Guide</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                      <SelectTrigger className="h-12 rounded-xl bg-muted border-border font-bold px-4">
                                      <SelectValue placeholder="Select a Folk Guide" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {folkGuides.map(guide => (
                                          <SelectItem key={guide.id} value={guide.id} className="font-bold">
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
            </div>
            
            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {user ? 'Update Database' : 'Provision Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
