
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { FirebaseConfigError } from './firebase-config-error';
import { useToast } from '@/hooks/use-toast';

export function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, appUser, loading, error } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    // This effect handles redirection logic.
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect if the user is not an admin but the page is admin-only.
    if (adminOnly && appUser && !appUser.role?.includes('Admin')) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to view this page.'
      });
      router.replace('/dashboard');
    }
  }, [user, appUser, loading, router, adminOnly, toast]);

  if (error) {
    return <FirebaseConfigError error={error} />;
  }
  
  // While loading or if there's no user, show a spinner.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // If the page is admin-only and the user is loaded but is NOT an admin,
  // show a spinner to prevent flashing content while the redirect effect runs.
  if (adminOnly && appUser && !appUser.role?.includes('Admin')) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If all checks pass, render the children.
  return <>{children}</>;
}
