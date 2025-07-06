
'use client';

import type { ReactNode } from "react";
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, Users, UserSquare, Settings, Gem, PhoneCall, Headset, LogOut, UserCog } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from './ui/sheet';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import { useAuth } from '@/contexts/auth-context';

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
    { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
    { href: "/call-analyzer", label: "Call Analyzer", icon: PhoneCall },
    { href: "/user-management", label: "User Management", icon: UserCog },
];

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { user, appUser, signOut } = useAuth();
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b bg-card px-4 sm:px-6">
       <div className="sm:hidden">
         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs flex flex-col">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium mt-4">
                <Link
                  href="/"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                  onClick={() => setIsSheetOpen(false)}
                >
                  <Gem className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Folk Contact Center</span>
                </Link>
                {navItems.map((item) => {
                  if (item.href === '/user-management' && !appUser?.role?.includes('Admin')) {
                    return null;
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                        isActive(item.href) && "text-foreground font-semibold"
                      )}
                      onClick={() => setIsSheetOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                    pathname.startsWith('/settings') && "text-foreground font-semibold"
                  )}
                  onClick={() => setIsSheetOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </nav>
               <SheetFooter className="mt-auto">
                {user && (
                    <Button variant="outline" className="w-full" onClick={() => {
                      signOut();
                      setIsSheetOpen(false);
                    }}>
                        <LogOut className="mr-2 h-4 w-4"/>
                        Sign Out
                    </Button>
                )}
               </SheetFooter>
            </SheetContent>
          </Sheet>
       </div>

      <div className="flex-1 overflow-hidden">
        <h1 className="font-semibold text-lg truncate">{title}</h1>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <UserNav />
      </div>
    </header>
  );
}
