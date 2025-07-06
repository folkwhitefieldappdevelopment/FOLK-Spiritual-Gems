
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
    if (loading) return; // Don't do anything while loading.

    if (!user) {
      router.replace('/login');
      return;
    }

    if (adminOnly && !appUser?.role?.includes('Admin')) {
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

  // Show a spinner while loading, if user is not logged in, or if an admin page is being accessed by a non-admin
  if (loading || !user || (adminOnly && !appUser?.role?.includes('Admin'))) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
