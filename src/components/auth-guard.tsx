
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuthGuardProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export function AuthGuard({ children, adminOnly = false }: AuthGuardProps) {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  React.useEffect(() => {
    // Don't do anything while auth is loading.
    if (loading) {
      return;
    }

    // If there's no user, redirect to login.
    if (!user) {
      router.replace('/login');
      setIsRedirecting(true);
      return;
    }
    
    // If the route is admin-only and the user is not an admin, redirect.
    if (adminOnly && !appUser?.role.includes('Admin')) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.'
      });
      router.replace('/dashboard');
      setIsRedirecting(true);
      return;
    }

    // If all checks pass, we are not redirecting.
    setIsRedirecting(false);

  }, [user, appUser, loading, adminOnly, router, toast]);

  // While auth is loading or a redirect is in progress, show a spinner.
  if (loading || isRedirecting || !appUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If all checks pass and we are not redirecting, render the children.
  return <>{children}</>;
}
