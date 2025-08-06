
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
  const [isVerifying, setIsVerifying] = React.useState(true);

  React.useEffect(() => {
    if (loading) {
      return; // Wait until Firebase auth state is resolved
    }

    // If on a public route, do nothing.
    // If a logged-in user tries to access a public route (like /login), they will be redirected by the page itself.
    if (publicRoutes.includes(pathname)) {
      setIsVerifying(false);
      return;
    }

    // If not on a public route and user is not authenticated, redirect to login.
    if (!user) {
      router.replace('/login');
      return; // Early exit, no need to proceed
    }

    // If user is authenticated but appUser details (with roles) are not yet loaded, wait.
    if (!appUser) {
        return; 
    }
    
    // Check if the user has a role assigned. If not, they shouldn't access anything.
    if (!appUser.role || appUser.role.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Role Assigned',
            description: 'You do not have a role assigned. Please contact an administrator.'
        });
        router.replace('/login');
        return;
    }

    // Check for role-based permissions for the current route
    let hasPermission = true;
    const requiredRoles = Object.keys(routePermissions).find(route => pathname.startsWith(route));

    if (requiredRoles) {
      hasPermission = routePermissions[requiredRoles].some(role => appUser.role.includes(role));
    }
    
    if (!hasPermission) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.'
      });
      router.replace('/dashboard'); // Redirect to a default safe page
      return;
    }

    // If all checks pass, verification is complete.
    setIsVerifying(false);

  }, [user, appUser, loading, pathname, router, toast]);

  if (loading || (!publicRoutes.includes(pathname) && isVerifying)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
