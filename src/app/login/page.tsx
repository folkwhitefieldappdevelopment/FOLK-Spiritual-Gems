
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
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordDialog } from '@/components/forgot-password-dialog';

export default function LoginPage() {
  const { user, signIn, loading, error, completeSignInWithEmailLink, isSignInLink } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);

  // This effect handles the magic link sign-in
  React.useEffect(() => {
    const verifyLink = async () => {
        if (isSignInLink()) {
            setIsVerifyingLink(true);
            try {
                await completeSignInWithEmailLink();
                // On success, the main auth listener will redirect.
            } catch (err: any) {
                toast({
                    variant: 'destructive',
                    title: 'Sign-in Failed',
                    description: err.message,
                });
                router.replace('/login');
            } finally {
                setIsVerifyingLink(false);
            }
        }
    };
    verifyLink();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // If we are not loading and not logged in, show the login form.
  if (!user) {
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

  // If user is logged in but we are still on this page for a moment, show a loader
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
