
'use client';

import type { ReactNode } from "react";
import * as React from 'react';
import { UserNav } from './user-nav';
import { Button } from "./ui/button";
import { Menu, Edit } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import Link from "next/link";
import { Users, UserSquare, Settings, Gem, Headset, UserCog, History, FileText, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./theme-switcher";


type PageHeaderProps = {
  title: string;
  description: React.ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
    const { appUser } = useAuth();
    const pathname = usePathname();
    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const navItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/groups", label: "Groups", icon: UserSquare },
      { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
      { href: "/blank-page", label: "Blank Page", icon: FileText },
      { href: "/user-management", label: "User Management", icon: UserCog, adminOnly: true },
      { href: "/user-audit", label: "User Audit", icon: History, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ];

    const isActive = (href: string) => {
      if (href === '/contacts' && pathname === '/') return true;
      return pathname.startsWith(href);
    }
    
    const userCanSee = (item: typeof navItems[0]) => {
        if (!item.adminOnly) return true;
        if (appUser?.role.includes('Admin')) return true;
        // Special case for guides to see user management
        if (item.href === '/user-management' && appUser?.role.includes('Folk Guide')) return true;
        if (item.href === '/user-audit' && appUser?.role.includes('Folk Guide')) return true;
        return false;
    }
  
    const handleLinkClick = () => {
      setIsMobileSheetOpen(false);
    };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background px-4 py-3 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:gap-4">
       <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Mobile Menu</SheetTitle>
            <SheetDescription>A list of navigation links for the application.</SheetDescription>
          </SheetHeader>
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              onClick={handleLinkClick}
            >
              <Gem className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">FOLK SPIRITUAL GEMS</span>
            </Link>
            {navItems.map((item) => {
               if (!userCanSee(item)) return null;
               return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-2.5 ${isActive(item.href) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={handleLinkClick}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
               )
            })}
          </nav>
          <div className="mt-auto">
            <ThemeSwitcher />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h1 className="font-semibold text-lg truncate">{title}</h1>
        <div className="text-sm text-muted-foreground break-words">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <UserNav />
      </div>
    </header>
  );
}
