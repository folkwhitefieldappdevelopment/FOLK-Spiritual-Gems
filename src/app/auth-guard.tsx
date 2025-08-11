
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuthGuardProps = {
  children: React.ReactNode;
};

const publicRoutes = ['/login'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return; // Wait for Firebase auth to load

    const isPublic = publicRoutes.includes(pathname);

    // Not logged in → redirect to login
    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }
  }, [user, appUser, loading, pathname, router]);

  // Show loading spinner while:
  // - Firebase auth is loading
  // - Logged in but Firestore profile not loaded yet
  const isPublic = publicRoutes.includes(pathname);
  const isAuthReady = !loading && (!user || (user && appUser));

  if (!isAuthReady && !isPublic) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
