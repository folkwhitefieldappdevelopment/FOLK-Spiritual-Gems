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
  const { toast } = useToast();

  React.useEffect(() => {
    if (loading) return; // Wait for Firebase auth to load

    const isPublic = publicRoutes.includes(pathname);

    // Not logged in → redirect to login
    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }

    // Logged in but Firestore profile still loading (role not set yet)
    if (user && (!appUser || appUser.role === undefined)) {
      return;
    }

    // Once appUser is loaded, do role-based checks
    if (appUser) {
      const roles = Array.isArray(appUser.role)
        ? appUser.role
        : [appUser.role].filter(Boolean);

      // No role assigned → revoke access
      if (roles.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Access Revoked',
          description: 'You do not have a role assigned. Please contact an administrator.',
        });
        router.replace('/login');
        return;
      }

      // Check route permissions
      const requiredRolesKey = Object.keys(routePermissions)
        .find(route => pathname.startsWith(route));
      if (requiredRolesKey) {
        const hasPermission = routePermissions[requiredRolesKey]
          .some(role =>
            roles.map(r => r.toLowerCase()).includes(role.toLowerCase())
          );
        if (!hasPermission) {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this page.',
          });
          router.replace('/dashboard');
        }
      }
    }
  }, [user, appUser, loading, pathname, router, toast]);

  // Show loading spinner while:
  // - Firebase auth is loading
  // - Logged in but Firestore profile (role) not loaded yet
  const isPublic = publicRoutes.includes(pathname);
  const isAuthReady =
    !loading &&
    (!user || (appUser && appUser.role !== undefined));

  if (!isAuthReady && !isPublic) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
