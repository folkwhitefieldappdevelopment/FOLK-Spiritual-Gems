'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppToast } from '@/contexts/toast-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth as clientAuth } from '@/lib/firebase';
import Image from 'next/image';
import placeholderData from '@/app/lib/placeholder-images.json';

// ─── Schema ────────────────────────────────────────────────────────────────────
const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

// ─── Password reset action — module-level, never recreated ────────────────────
async function sendPasswordResetAction(email: string): Promise<{ success: boolean; message: string }> {
  // Guard against uninitialized Firebase auth
  if (!clientAuth) {
    return { success: false, message: 'Authentication service is not available.' };
  }
  try {
    await sendPasswordResetEmail(clientAuth, email);
    return { success: true, message: 'If an account with that email exists, a reset link has been sent.' };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, message: error.message ?? 'An unexpected error occurred.' };
  }
}

// ─── Forgot Password Dialog ───────────────────────────────────────────────────
const ForgotPasswordDialog = React.memo(() => {
  const { toast } = useAppToast();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEmail('');
      setError('');
      setIsSubmitting(false);
    }
  }, []);

  const handlePasswordReset = React.useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const result = await sendPasswordResetAction(email);
    if (result.success) {
      toast({ title: 'Password Reset Email Sent', description: result.message });
      setOpen(false);
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  }, [email, toast]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handlePasswordReset(); },
    [handlePasswordReset]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" className="w-full text-sm font-normal">
          Forgot Password?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Your Password</DialogTitle>
          <DialogDescription>
            Enter your email and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="reset-email">Email Address</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePasswordReset} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
ForgotPasswordDialog.displayName = 'ForgotPasswordDialog';

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, loading, error: authError, signIn } = useAuth();
  const router = useRouter();
  const { toast } = useAppToast();

  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const logo = React.useMemo(() => placeholderData.app_logo, []);

  const onSubmit = React.useCallback(async (data: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(data.email, data.password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setFormError(errorMessage);
    }
  }, [signIn]);

  const togglePassword = React.useCallback(() => setShowPassword((p) => !p), []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  // Handle redirect in useEffect to avoid 'setState during render' error
  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  // Show loading while initializing or redirecting
  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  if (authError) {
    return <FirebaseConfigError error={authError} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="h-24 w-24 relative bg-primary rounded-full shadow-lg border-2 border-primary/20 p-2 flex items-center justify-center overflow-hidden">
            <Image
              src={logo.url}
              alt={logo.alt}
              fill
              priority
              className="object-contain p-2"
              data-ai-hint={logo.hint}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-primary tracking-tight">FOLK Spiritual Gems</h1>
            <p className="text-sm text-muted-foreground">Sign in to your outreach dashboard</p>
          </div>
        </div>

        <Card className="w-full shadow-xl rounded-2xl border bg-card">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="pr-10"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                          onClick={togglePassword}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-bold shadow-md"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>

            <div className="mt-4">
              <ForgotPasswordDialog />
            </div>

            {formError && (
              <Alert variant="destructive" className="mt-4" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
