
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
  const [isAccessChecked, setIsAccessChecked] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      return; // Wait for authentication to complete
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (adminOnly && !appUser?.role.includes('Admin')) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this page.'
        });
        router.replace('/dashboard');
        return;
    }

    // All checks passed
    setIsAccessChecked(true);

  }, [user, appUser, loading, adminOnly, router, toast]);

  if (!isAccessChecked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
