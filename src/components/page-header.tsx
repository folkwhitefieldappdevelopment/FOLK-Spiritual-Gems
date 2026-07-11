'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import { Button } from './ui/button';
import { Menu, Users, Settings, Gem, UserCog, History, UsersRound, Activity, WifiOff, Target } from 'lucide-react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserNav } from './user-nav';
import { NotificationCenter } from './notification-center';
import { useAuth } from '@/contexts/auth-context';
import { useConnectivity } from '@/contexts/connectivity-context';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import placeholderData from '@/app/lib/placeholder-images.json';
import { MobileBottomNav } from './mobile-bottom-nav';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  roles?: UserRole[];
};

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Gem },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/live-activity', label: 'Live Activity', icon: Activity },
  { href: '/assignments', label: 'Assignments', icon: UsersRound, roles: ['Admin', 'Folk Guide'] },
  {
    href: '/user-management',
    label: 'Users',
    icon: UserCog,
    roles: ['Admin', 'Folk Guide'],
  },
  {
    href: '/user-audit',
    label: 'Audit',
    icon: History,
    roles: ['Admin', 'Folk Guide'],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type PageHeaderProps = {
  title: string;
  description: React.ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const { isOnline, isSlow } = useConnectivity();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

  const navItems = React.useMemo(() => {
    if (!appUser) return [];
    return allNavItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.some((role) => appUser.role.includes(role));
    });
  }, [appUser]);

  // Filter items specifically for the mobile "More" menu to avoid duplicates with bottom nav
  const sheetNavItems = React.useMemo(() => {
    const bottomNavPaths = ['/dashboard', '/contacts', '/calling-assistant', '/groups'];
    return navItems.filter(item => !bottomNavPaths.includes(item.href));
  }, [navItems]);

  const isActive = (href: string) => {
    if (href === '/contacts' && (pathname === '/' || pathname === '/contacts'))
      return true;
    if (href !== '/contacts' && href !== '/') {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  const handleLinkClick = () => {
    setIsMobileSheetOpen(false);
  };

  const logo = placeholderData.app_logo;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 mb-2 overflow-hidden">
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden shrink-0 h-10 w-10 rounded-xl">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs flex flex-col p-0 bg-background">
            <SheetHeader className="p-6 border-b text-center shrink-0">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md border-2 border-primary/20 overflow-hidden">
                  <Image 
                    src={logo.url} 
                    alt={logo.alt} 
                    width={40} 
                    height={40}
                    className="object-contain"
                    data-ai-hint={logo.hint}
                  />
              </div>
              <SheetTitle className="text-foreground font-black text-lg uppercase tracking-tight">
                  FOLK Spiritual Gems
              </SheetTitle>
              <SheetDescription className="text-[10px] font-bold uppercase tracking-widest">
                Main Navigation
              </SheetDescription>
            </SheetHeader>

            {/* Account Row - Now at the TOP for visibility */}
            <div className="px-4 py-2 border-b bg-muted/20 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <UserNav isSheet={true} />
                </div>
                <div className="shrink-0">
                  <NotificationCenter />
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6">
              <div className="grid gap-1 px-3">
                  {sheetNavItems.map((item) => (
                  <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-4 rounded-xl px-5 py-4 text-base font-bold transition-all hover:bg-muted group',
                        isActive(item.href) 
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                          : 'text-muted-foreground'
                      )}
                      onClick={handleLinkClick}
                  >
                      <item.icon className={cn("h-5 w-5", isActive(item.href) ? "text-primary-foreground" : "text-primary/60 group-hover:text-primary")} />
                      {item.label}
                  </Link>
                  ))}
              </div>
            </nav>

            <div className="p-8 border-t bg-muted/10 text-center opacity-30 shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">CRM v2.0 Stable</p>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex-1 flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-xl md:text-2xl truncate text-foreground leading-tight tracking-tight uppercase">{title}</h1>
              {!isOnline ? (
                  <div className="bg-destructive/10 text-destructive p-1 rounded-md">
                      <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
              ) : isSlow ? (
                  <div className="bg-orange-500/10 text-orange-600 p-1 rounded-md animate-pulse">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
              ) : null}
          </div>
          {description && (
              <div className="text-[9px] sm:text-xs text-muted-foreground truncate font-medium max-w-full opacity-60">
                  {description}
              </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {children}
        </div>
      </header>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setIsMobileSheetOpen(true)} />
    </>
  );
}
