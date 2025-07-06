"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserSquare, Settings, Gem, PhoneCall, Headset, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const navItems = [
    { href: "/", label: "Contacts", icon: Users },
    { href: "/groups", label: "Groups", icon: UserSquare },
    { href: "/calling-assistant", label: "Calling Assistant", icon: Headset },
    { href: "/call-analyzer", label: "Call Analyzer", icon: PhoneCall },
    { href: "/user-management", label: "User Management", icon: UserCog, adminOnly: true },
  ];
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon">
        <SidebarHeader>
            <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
                <Link href="/dashboard">
                    <Gem />
                    <span className="sr-only">Folk Contact Center</span>
                </Link>
            </Button>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {navItems.map((item) => {
                    if (item.adminOnly && !appUser?.role?.includes('Admin')) {
                        return null;
                    }
                    return (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Settings">
                        <Link href="/settings">
                            <Settings />
                            <span>Settings</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  );
}
