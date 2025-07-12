
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserSquare, Settings, Gem, Headset, UserCog, History } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeSwitcher } from "./theme-switcher";

export function AppSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const navItems = [
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
    { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
    { href: "/user-management", label: "User Management", icon: UserCog, adminOnly: true },
    { href: "/user-audit", label: "User Audit", icon: History, adminOnly: true },
  ];
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
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

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Gem className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">FOLK SPIRITUAL GEMS</span>
          </Link>
          {navItems.map((item) => {
            if (!userCanSee(item)) return null;
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <ThemeSwitcher />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                 className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
                      isActive('/settings')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
