
'use client';

import type { ReactNode } from "react";
import * as React from 'react';
import { UserNav } from './user-nav';
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import Link from "next/link";
import { Users, UserSquare, Settings, Gem, PhoneCall, Headset, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";


type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
    const { appUser } = useAuth();
    const pathname = usePathname();
    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const navItems = [
      { href: "/dashboard", label: "Dashboard", icon: Gem },
      { href: "/", label: "Contacts", icon: Users },
      { href: "/groups", label: "Groups", icon: UserSquare },
      { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
      { href: "/call-analyzer", label: "Call Analyzer", icon: PhoneCall },
      { href: "/user-management", label: "User Management", icon: UserCog, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ];

    const isActive = (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname.startsWith(href);
    }
  
    const handleLinkClick = () => {
      setIsMobileSheetOpen(false);
    };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              onClick={handleLinkClick}
            >
              <Gem className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Folk</span>
            </Link>
            {navItems.map((item) => {
               if (item.adminOnly && !appUser?.role?.includes('Admin')) {
                  return null;
               }
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
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <h1 className="font-semibold text-lg">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <UserNav />
      </div>
    </header>
  );
}
