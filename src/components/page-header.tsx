
'use client';

import type { ReactNode } from "react";
import * as React from 'react';
import { UserNav } from './user-nav';
import { SidebarTrigger } from "./ui/sidebar";

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <SidebarTrigger />
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
