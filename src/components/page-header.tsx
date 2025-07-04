
'use client';

import type { ReactNode } from "react";
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, Users, UserSquare, Settings, Gem, PhoneCall } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './ui/sheet';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
    { href: "/call-analyzer", label: "Call Analyzer", icon: PhoneCall },
];

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  // Close the sheet when the user navigates to a new page
  React.useEffect(() => {
    setIsSheetOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-card px-4 sm:px-6">
       <div className="sm:hidden">
         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Gem className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Spiritual Gems</span>
                </Link>
                {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                        isActive(item.href) && "text-foreground font-semibold"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                ))}
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                    pathname.startsWith('/settings') && "text-foreground font-semibold"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
       </div>

      <div className="flex-1 overflow-hidden">
        <h1 className="font-semibold text-lg truncate">{title}</h1>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <UserNav />
      </div>
    </header>
  );
}
