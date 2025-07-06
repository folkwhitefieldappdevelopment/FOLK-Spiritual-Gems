
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Loader2, Mail } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { user, signInWithEmail, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [emailSent, setEmailSent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // Only perform actions once the loading state is resolved.
    if (!loading && user) {
      // If there is a user, redirect to the dashboard.
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await signInWithEmail(email);
      setEmailSent(true);
    } catch (err) {
      // Errors are caught and set in the auth context,
      // which are then displayed by the FirebaseConfigError component.
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If there's a configuration or redirect error, show the error component.
  if (error) {
    return <FirebaseConfigError error={error} />;
  }
  
  // While checking auth state, show a loading indicator.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Verifying...</span>
      </div>
    );
  }

  // If loading is complete AND there is no user, it is safe to show the sign-in page.
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Gem className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>Folk Contact Center</CardTitle>
          {emailSent ? (
            <CardDescription>A sign-in link has been sent to your email address.</CardDescription>
          ) : (
            <CardDescription>Sign in with a magic link to continue.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <Mail className="mx-auto h-12 w-12 text-primary" />
              <p>Check your inbox (and spam folder) for an email from us. Click the link inside to sign in automatically.</p>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Sending...' : 'Send Sign-In Link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
