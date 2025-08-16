
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
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
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const LoginPageComponent = () => {
  const { user, loading, error: authError, signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(data.email, data.password);
      // The onAuthStateChanged listener in AuthProvider will handle the redirect
    } catch (error) {
      console.error("Sign-in failed", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setFormError(errorMessage);
    }
  };

  if (loading) {
     return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
    );
  }
  
  if (authError) {
      return <FirebaseConfigError error={authError} />
  }

  const isReferrerError = formError && formError.includes('auth/requests-from-referer');

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
                 <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
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
                Sign In
                </Button>
            </form>
            </Form>

            {formError && (
              isReferrerError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required: Authorize Domain</AlertTitle>
                  <AlertDescription>
                    <p>Your app's domain is not authorized for Firebase Authentication.</p>
                    <p className="font-semibold mt-2">To fix this:</p>
                     <ol className="list-decimal pl-5 mt-1 text-xs">
                        <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Credentials page</a>.</li>
                        <li>Find and edit the API key named "Browser key (auto created by Firebase)".</li>
                        <li>Under "Website restrictions," add the domain from the error message to the list.</li>
                        <li>Save the changes and refresh this page.</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Login Failed</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )
            )}
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
