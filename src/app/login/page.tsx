
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Loader2 } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useToast } from '@/hooks/use-toast';

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,36.631,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, signInWithGoogle, loading, error } = useAuth();
  const router = useRouter();
  
  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (error) {
    return <FirebaseConfigError error={error} />;
  }

  // While loading, or if the user object is already available (meaning a redirect is imminent),
  // show a loading/verifying screen. This prevents the login button from flashing.
  if (loading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{user ? 'Redirecting...' : 'Verifying...'}</span>
      </div>
    );
  }

  // If not loading and there's no user, show the sign-in UI.
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Gem className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>Folk Contact Center</CardTitle>
          <CardDescription>Sign in to continue to your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signInWithGoogle} className="w-full">
            <GoogleIcon />
            Sign In with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
