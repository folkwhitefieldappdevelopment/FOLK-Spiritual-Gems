"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserSquare, Settings, Gem, PhoneCall, Headset, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function AppSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const navItems = [
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
    { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
    { href: "/call-analyzer", label: "Call Analyzer", icon: PhoneCall },
    { href: "/user-management", label: "User Management", icon: UserCog },
  ];
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 left-0 hidden h-screen w-64 flex-col border-r bg-card sm:flex">
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Gem className="h-6 w-6" />
          <span>Folk Contact Center</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          if (item.href === '/user-management' && !appUser?.role?.includes('Admin')) {
            return null;
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive(item.href) && "bg-accent text-accent-foreground hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            pathname.startsWith('/settings') && "bg-accent text-accent-foreground hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
