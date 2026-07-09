'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';

/**
 * Authenticated App Shell
 * Centralizes the navigation sidebar and main layout container for all CRM pages.
 */
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#11121d]">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {children}
      </div>
    </div>
  );
}
