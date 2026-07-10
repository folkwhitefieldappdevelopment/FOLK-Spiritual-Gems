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
  Target,
  ChevronLeft,
  ChevronRight,
  Users2,
  PhoneCall,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import type { UserRole } from '@/lib/types';
import placeholderData from '@/app/lib/placeholder-images.json';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Gem },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/calling-assistant', label: 'Assistant', icon: PhoneCall },
  { href: '/groups', label: 'Groups', icon: Users2 },
  { href: '/goals', label: 'Goals', icon: Target },
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
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const navItems = React.useMemo(() => {
    if (!appUser) return [];
    return allNavItems.filter((item) => {
      if (!item.roles) return true;
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
    <Sidebar collapsible="icon" className="border-r shadow-sm">
      <SidebarHeader className="flex h-16 items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0 overflow-hidden">
            <Image 
              src={logo.url} 
              alt={logo.alt} 
              width={24} 
              height={24}
              className="object-contain invert brightness-0"
            />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-black uppercase tracking-tight text-foreground truncate">
              FOLK GEMS
            </span>
          )}
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2 pt-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={item.label}
                className={cn(
                  "h-10 transition-all",
                  isActive(item.href) 
                    ? "bg-accent text-accent-foreground font-bold" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-5 w-5", isActive(item.href) && "text-primary")} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith('/settings')}
              tooltip="Settings"
              className={cn(
                "h-10 transition-all",
                pathname.startsWith('/settings')
                  ? "bg-accent text-accent-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Link href="/settings">
                <Settings className={cn("h-5 w-5", pathname.startsWith('/settings') && "text-primary")} />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-1 py-2 flex flex-col items-center gap-4">
          <div className={cn("w-full flex items-center justify-center", !isCollapsed && "justify-between px-2")}>
            <UserNav />
            {!isCollapsed && (
               <button 
                  onClick={toggleSidebar}
                  className="h-7 w-7 rounded-md border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
               >
                 <ChevronLeft className="h-4 w-4" />
               </button>
            )}
          </div>
          {isCollapsed && (
             <button 
                onClick={toggleSidebar}
                className="h-7 w-7 rounded-md border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
             >
               <ChevronRight className="h-4 w-4" />
             </button>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}