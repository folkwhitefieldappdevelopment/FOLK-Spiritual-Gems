
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserSquare, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="sticky top-0 left-0 hidden h-screen w-16 flex-col border-r bg-card sm:flex">
        <nav className="flex flex-1 flex-col items-center gap-4 px-2 py-4">
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <LayoutDashboard className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Spiritual Gems</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    (item.href === '/' ? pathname === item.href : pathname.startsWith(item.href)) && "bg-accent text-accent-foreground hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
          <div className="mt-auto">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                    href="/settings"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                      pathname === '/settings' && "bg-accent text-accent-foreground hover:text-accent-foreground"
                    )}
                    >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
