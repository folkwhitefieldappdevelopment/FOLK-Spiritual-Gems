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
import { Loader2, ShieldCheck, Eye, EyeOff, Wand2 } from 'lucide-react';
import { userRoles, type AppUser, type UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { provisionUserOnServer } from '@/services/user-service';
import { useAuth } from '@/contexts/auth-context';

const userFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit Indian mobile number.' }),
  password: z.string().optional(),
  role: z.array(z.string()).min(1, { message: 'Please select at least one role.' }),
  fgCode: z.string().optional(),
  guideId: z.string().optional(),
}).superRefine((data, ctx) => {
    // FG Code check
    if (data.role.includes('Folk Guide') && (!data.fgCode || data.fgCode.trim().length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'FG Code is required for Folk Guides.',
            path: ['fgCode'],
        });
    }
    // Enabler guide check
    if (data.role.includes('Folk Enabler') && !data.guideId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'A Folk Guide must be assigned to an Enabler.',
            path: ['guideId'],
        });
    }
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
  const [showPassword, setShowPassword] = React.useState(false);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
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
          password: '',
          role: user.role,
          fgCode: user.fgCode || '',
          guideId: user.reportsTo?.guideId || '',
        });
      } else {
        form.reset({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: [],
          fgCode: '',
          guideId: '',
        });
      }
      setIsSubmitting(false);
      setShowPassword(false);
    }
  }, [isOpen, user, form]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure it meets complexity for safety
    pass += "A1!"; 
    form.setValue('password', pass, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
  };

  async function onSubmit(data: UserFormValues) {
    if (!appUser) return;

    // Manual validation for password on create path
    if (!user && (!data.password || data.password.length < 6)) {
        form.setError('password', { message: 'Password is required and must be at least 6 characters.' });
        return;
    }

    setIsSubmitting(true);
    try {
        if (user) {
            await onUpdate(data, user.id);
        } else {
            await provisionUserOnServer({
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: data.password!,
                role: data.role as UserRole[],
                fgCode: data.fgCode,
                guideId: data.guideId
            });
            
            toast({
                title: 'User Provisioned',
                description: `Auth account created for ${data.name}.`,
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {!user && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between ml-1">
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Initial Password</FormLabel>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={generatePassword}
                                    className="h-auto p-0 text-[9px] font-black uppercase text-primary hover:bg-transparent"
                                >
                                    <Wand2 className="h-2.5 w-2.5 mr-1" /> Generate
                                </Button>
                            </div>
                            <div className="relative">
                                <FormControl>
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        {...field} 
                                        className="h-12 rounded-xl bg-muted border-border font-bold px-4 pr-10" 
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:bg-transparent"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                  />
              )}

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
                            <ChevronDown className="h-4 w-4 opacity-30" />
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

function ChevronDown(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-9" />
        </svg>
    )
}
