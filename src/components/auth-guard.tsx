
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
  const hasTriggeredRedirectRef = React.useRef(false);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined' && !hasTriggeredRedirectRef.current) {
        hasTriggeredRedirectRef.current = true;
        router.replace('/login');
    }
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (adminOnly && !appUser?.role.includes('Admin')) {
    if (typeof window !== 'undefined' && !hasTriggeredRedirectRef.current) {
        hasTriggeredRedirectRef.current = true;
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this page.'
        });
        router.replace('/dashboard');
    }
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is logged in and all checks pass, render the children
  return <>{children}</>;
}
