'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { BackgroundTaskProvider } from '@/contexts/background-task-context';
import { BackgroundJobsWidget } from '@/components/background-jobs-widget';

/**
 * Authenticated App Shell
 * Centralizes the navigation sidebar and main layout container for all CRM pages.
 * Integrates SidebarProvider for collapsible desktop navigation.
 * Includes mobile padding-bottom to prevent content overlap with the tab bar.
 */
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BackgroundTaskProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-w-0 transition-all duration-300">
            <div className="flex flex-col sm:gap-4 sm:py-4 pb-20 sm:pb-0">
              {children}
            </div>
          </SidebarInset>
        </div>
        <BackgroundJobsWidget />
      </SidebarProvider>
    </BackgroundTaskProvider>
  );
}
