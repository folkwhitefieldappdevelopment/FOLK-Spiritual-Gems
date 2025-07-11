
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
  const [hasRedirected, setHasRedirected] = React.useState(false);

  React.useEffect(() => {
    if (loading || hasRedirected) return;

    // Condition 1: Not logged in
    if (!user) {
      router.replace('/login');
      setHasRedirected(true);
      return;
    }

    // Condition 2: Admin page, but user is not an admin
    if (adminOnly && appUser && !appUser.role?.includes('Admin')) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to view this page.'
      });
      router.replace('/dashboard');
      setHasRedirected(true);
      return;
    }
    
  }, [user, appUser, loading, router, adminOnly, toast, hasRedirected]);
  
  // Handle critical Firebase configuration error first
  if (error) {
    return <FirebaseConfigError error={error} />;
  }

  // Show a loading spinner while auth state is being determined OR
  // if a redirection is about to happen. This prevents content flashing.
  const isBlocked = !user || (adminOnly && appUser && !appUser.role?.includes('Admin'));
  if (loading || isBlocked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // If all checks pass, render the protected content.
  return <>{children}</>;
}
