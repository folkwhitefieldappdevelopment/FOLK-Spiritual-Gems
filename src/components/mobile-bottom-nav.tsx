'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gem, Users, PhoneCall, UsersRound, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileBottomNavProps = {
  onMoreClick: () => void;
};

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Gem },
    { href: '/contacts', label: 'Contacts', icon: Users },
    { href: '/calling-assistant', label: 'Assistant', icon: PhoneCall },
    { href: '/groups', label: 'Groups', icon: UsersRound },
  ];

  const isActive = (href: string) => {
    if (href === '/contacts' && pathname.startsWith('/contacts')) return true;
    if (href === '/groups' && pathname.startsWith('/groups')) return true;
    return pathname === href;
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive(item.href) 
                ? "text-primary font-bold" 
                : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              isActive(item.href) && "bg-accent"
            )}>
              <item.icon className={cn("h-5 w-5", isActive(item.href) && "text-primary")} />
            </div>
            <span className="text-[10px] uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
        
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <div className="p-1.5 rounded-xl">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] uppercase tracking-tighter">More</span>
        </button>
      </div>
    </nav>
  );
}
