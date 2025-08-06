
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuthGuardProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
  adminOrGuideOnly?: boolean;
};

export function AuthGuard({ children, adminOnly = false, adminOrGuideOnly = false }: AuthGuardProps) {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      setIsRedirecting(true);
      return;
    }

    let hasPermission = true;
    if (adminOnly) {
      hasPermission = !!appUser?.role.includes('Admin');
    } else if (adminOrGuideOnly) {
      hasPermission = !!appUser?.role.includes('Admin') || !!appUser?.role.includes('Folk Guide');
    }
    
    if (!hasPermission) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.'
      });
      router.replace('/dashboard');
      setIsRedirecting(true);
      return;
    }

    if (appUser && (!appUser.role || appUser.role.length === 0)) {
      toast({
          variant: 'destructive',
          title: 'No Role Assigned',
          description: 'You do not have a role assigned. Please contact an administrator.'
      });
      router.replace('/login');
      setIsRedirecting(true);
      return;
    }

    setIsRedirecting(false);

  }, [user, appUser, loading, adminOnly, adminOrGuideOnly, router, toast]);

  if (loading || isRedirecting || !appUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
