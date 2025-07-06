'use client';

import * as React from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { user, signIn, loading, error } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  // Local loading state specifically for the magic link verification process
  const [isVerifyingLink, setIsVerifyingLink] = React.useState(false);

  // This effect handles the magic link sign-in
  React.useEffect(() => {
    // Check if the current URL is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsVerifyingLink(true);
      // Get the email from localStorage
      let emailFromStorage = window.localStorage.getItem('emailForSignIn');
      if (!emailFromStorage) {
        // If the email is not in storage, prompt the user for it
        emailFromStorage = window.prompt('Please provide your email for confirmation');
      }
      
      if (emailFromStorage) {
        // Sign in the user with the email and the link
        signInWithEmailLink(auth, emailFromStorage, window.location.href)
          .then(() => {
            // On success, onAuthStateChanged will handle the redirect.
            // Clean up the stored email
            window.localStorage.removeItem('emailForSignIn');
            // The main `loading` state from AuthContext will take over now.
            // No need to set isVerifyingLink to false here.
          })
          .catch((err) => {
            console.error("Sign in with email link error:", err);
            toast({
              variant: 'destructive',
              title: 'Sign-in Failed',
              description: 'The sign-in link is invalid or has expired. Please create a new user.',
            });
            router.replace('/login'); // Go back to login on failure
            setIsVerifyingLink(false); // Stop loading on failure
          });
      } else {
        // No email available to complete the link sign-in.
        setIsVerifyingLink(false);
      }
    }
  }, [router, toast]);

  React.useEffect(() => {
    // Redirect if user is logged in and auth is not loading
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await signIn(email, password);
      // On successful sign-in, the useEffect hook will trigger the redirect
    } catch (err) {
      // Errors are already caught and displayed via toast in the auth context
    }
  };
  
  if (error) {
    return <FirebaseConfigError error={error} />;
  }
  
  // Show a generic loading spinner if the auth context is loading OR if we're processing a magic link
  if (loading || isVerifyingLink) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="mb-8">
        <Image
          src="https://i.ibb.co/r2yv1gN/image.png"
          alt="A collage of Srila Prabhupada"
          width={200}
          height={200}
          className="rounded-full object-cover shadow-2xl"
          data-ai-hint="Srila Prabhupada"
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>FOLK SPIRITUAL GEM</CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
