'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Users,
  Settings,
  Gem,
  UserCog,
  History,
  UsersRound,
  Activity,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import type { UserRole } from '@/lib/types';
import placeholderData from '@/app/lib/placeholder-images.json';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Gem },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/pending-logs', label: 'Pending', icon: Clock },
  { href: '/live-activity', label: 'Activity', icon: Activity },
  { href: '/assignments', label: 'Assign', icon: UsersRound, roles: ['Admin', 'Folk Guide'] },
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
];

export function AppSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const navItems = React.useMemo(() => {
    if (!appUser) return [];
    return allNavItems.filter((item) => {
      if (!item.roles) return true; // Public item
      return item.roles.some((role) => appUser.role.includes(role));
    });
  }, [appUser]);

  const isActive = (href: string) => {
    if (href === '/contacts' && (pathname === '/' || pathname === '/contacts'))
      return true;
    if (href !== '/contacts' && href !== '/') {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  const logo = placeholderData.app_logo;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-14 flex-col border-r bg-background sm:flex shadow-2xl">
      <nav className="flex flex-col items-center gap-4 px-2 py-4">
        <Link href="/" className="mb-2 p-1 bg-primary rounded-full border shadow-sm h-10 w-10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
          <Image 
            src={logo.url} 
            alt={logo.alt} 
            width={32} 
            height={32}
            className="object-contain"
            data-ai-hint={logo.hint}
          />
        </Link>
        {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                  "flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50",
                  isActive(item.href) && "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              )}
          >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-black uppercase leading-none tracking-tighter">{item.label}</span>
          </Link>
        ))}
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
         <Link
              href="/settings"
              className={cn(
                  "flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground transition-all hover:text-foreground",
                  pathname.startsWith('/settings') && "bg-accent text-accent-foreground"
              )}
          >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Settings</span>
          </Link>
         <div className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
            <UserNav />
        </div>
      </nav>
    </aside>
  );
}
