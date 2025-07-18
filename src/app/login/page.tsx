
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Gem, Eye, EyeOff } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordDialog } from '@/components/forgot-password-dialog';

export default function LoginPage() {
  const { user, signIn, loading, error } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);

  // This effect handles the magic link sign-in
  React.useEffect(() => {
    // Check if the current URL is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsVerifyingLink(true);
      // Get the email from localStorage
      let emailFromStorage = window.localStorage.getItem('emailForSignIn');
      
      if (!emailFromStorage) {
        // If email is not in storage, it's a new user on a new device.
        // We can't prompt because that often fails. Firebase stores the email in the link itself.
        // We let signInWithEmailLink handle it by passing null, but we need to remove the item
        // from local storage if it's there from a previous attempt.
        // The firebase client will parse the email from the link.
        emailFromStorage = window.prompt('Please provide your email for confirmation');
      }
      
      signInWithEmailLink(auth, emailFromStorage!, window.location.href)
        .then(() => {
          // On success, onAuthStateChanged will handle the redirect.
          window.localStorage.removeItem('emailForSignIn');
          // No need to set isVerifyingLink to false, as the app will redirect.
        })
        .catch((err) => {
          console.error("Sign in with email link error:", err);
          let description = 'The sign-in link is invalid or has expired. Please ask an admin to resend the invite.';
          if (err.code === 'auth/invalid-email') {
            description = 'The email you provided does not match the one in the sign-in link. Please try again.';
          }
          toast({
            variant: 'destructive',
            title: 'Sign-in Failed',
            description,
          });
          router.replace('/login'); // Go back to login on failure
          setIsVerifyingLink(false); // Stop loading on failure
        });
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
    <>
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex h-40 w-40 items-center justify-center rounded-full bg-primary/10 shadow-2xl">
          <Gem className="h-24 w-24 text-primary drop-shadow-lg" />
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">FOLK SPIRITUAL GEMS</CardTitle>
            <CardDescription>
              Central Contact Management App
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      disabled={loading}
                  >
                      Forgot Password?
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <ForgotPasswordDialog isOpen={isForgotPasswordOpen} setIsOpen={setIsForgotPasswordOpen} />
    </>
  );
}
