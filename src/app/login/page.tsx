
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Gem, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Separator } from '@/components/ui/separator';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
        <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"></path>
    </svg>
)

const LoginPageComponent = () => {
  const { user, loading, error: authError, sendSignInLink, signInWithEmailLink, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [formError, setFormError] = React.useState<string | null>(null);
  const [linkSent, setLinkSent] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '' },
  });

  React.useEffect(() => {
    // This effect handles the user clicking the link in their email
    const verifySignInLink = async () => {
      const email = window.localStorage.getItem('emailForSignIn');
      if (email && window.location.href.includes('apiKey') && window.location.href.includes('oobCode')) {
        setIsVerifying(true);
        try {
          await signInWithEmailLink(email, window.location.href);
          // On successful sign-in, the main AuthProvider will redirect to the dashboard.
          // We clear the URL to prevent re-use of the sign-in link.
          router.replace('/login');
        } catch (error) {
          console.error("Sign-in verification failed", error);
          toast({ variant: 'destructive', title: 'Invalid Link', description: 'The sign-in link is invalid or has expired. Please try again.' });
          setFormError('The sign-in link is invalid or has expired. Please try again.');
        } finally {
          window.localStorage.removeItem('emailForSignIn');
          setIsVerifying(false);
        }
      }
    };
    verifySignInLink();
  }, [signInWithEmailLink, router, toast]);

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    setLinkSent(false);
    try {
      await sendSignInLink(data.email);
      setLinkSent(true);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setFormError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setFormError(null);
    try {
        await signInWithGoogle();
        // The onAuthStateChanged listener in AuthProvider will handle the redirect
    } catch (error) {
        console.error("Google Sign-In failed", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during Google Sign-In.";
        setFormError(errorMessage);
        setIsGoogleLoading(false);
    }
  };
  
  if (isVerifying || loading) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying your identity...</p>
      </div>
    );
  }
  
  if (authError) {
      return <FirebaseConfigError error={authError} />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Gem className="h-8 w-8" />
          </div>
          <CardTitle>FOLK Spiritual Gems</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Sign in with Google
            </Button>
            
            <div className="flex items-center space-x-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
            </div>

            {linkSent ? (
                <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                    <AlertCircle className="h-4 w-4 !text-green-600 dark:!text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-300">Check Your Email</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        A secure sign-in link has been sent to your email address.
                    </AlertDescription>
                </Alert>
            ) : (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                            <Input placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                    >
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Sign-In Link
                    </Button>
                </form>
                </Form>
            )}

            {formError && (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Login Failed</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LoginPageComponent />
        </React.Suspense>
    )
}
