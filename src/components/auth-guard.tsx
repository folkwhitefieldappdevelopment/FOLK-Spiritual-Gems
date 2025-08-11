
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuthGuardProps = {
  children: React.ReactNode;
};

// Define public routes that don't require authentication
const publicRoutes = ['/login'];

// Define routes and their required roles
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
    // This effect handles redirection for unauthenticated users and permission checks for authenticated users.
    if (loading) {
      return; // Wait until Firebase auth state is resolved.
    }

    const isPublic = publicRoutes.includes(pathname);

    if (!user && !isPublic) {
      // If not authenticated and not on a public page, redirect to login.
      router.replace('/login');
      return;
    }
    
    if (user && !appUser) {
        // Auth is loaded, but Firestore profile is still loading. Wait for it.
        return;
    }

    if (appUser) {
      // User is authenticated and appUser profile is loaded. Now, check permissions.
      // Check if the user has a role assigned. If not, they shouldn't access anything.
      if (!appUser.role || appUser.role.length === 0) {
          toast({
              variant: 'destructive',
              title: 'Access Revoked',
              description: 'You do not have a role assigned. Please contact an administrator.'
          });
          router.replace('/login');
          return;
      }
      
      // Check for role-based permissions for the current route
      const requiredRolesKey = Object.keys(routePermissions).find(route => pathname.startsWith(route));
      if (requiredRolesKey) {
        const hasPermission = routePermissions[requiredRolesKey].some(role => appUser.role.includes(role));
        if (!hasPermission) {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have permission to view this page.'
            });
            router.replace('/dashboard'); // Redirect to a default safe page
        }
      }
    }

  }, [user, appUser, loading, pathname, router, toast]);
  
  // Render a loading spinner if Firebase auth is loading OR if the user is authenticated but their Firestore profile hasn't loaded yet.
  // This prevents rendering the page before permissions can be checked.
  const isAuthReady = !loading;
  const isPublic = publicRoutes.includes(pathname);
  if (!isAuthReady || (isAuthReady && !appUser && !isPublic)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
