
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

type AuthGuardProps = {
  children: React.ReactNode;
};

const publicRoutes = ['/login'];

const routePermissions: { [key: string]: string[] } = {
  '/settings': ['Admin'],
  '/user-management': ['Admin', 'Folk Guide'],
  '/user-audit': ['Admin', 'Folk Guide'],
  '/assignments': ['Admin', 'Folk Guide'],
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) {
      return; // Wait for Firebase auth to load
    }

    const isPublic = publicRoutes.includes(pathname);

    if (!user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  const isPublic = publicRoutes.includes(pathname);
  if (loading || (!isPublic && !user)) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
