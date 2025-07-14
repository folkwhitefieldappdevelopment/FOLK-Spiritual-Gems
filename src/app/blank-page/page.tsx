
'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { AuthGuard } from '@/components/auth-guard';

function BlankPageComponent() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader
          title="Blank Page"
          description="This is a new, empty page."
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
          <div className="text-center py-12 text-muted-foreground">
            <p>This page is ready for new content.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function BlankPage() {
    return (
        <AuthGuard>
            <BlankPageComponent />
        </AuthGuard>
    )
}
