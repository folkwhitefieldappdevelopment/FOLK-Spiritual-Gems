
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import CoEnablerClient from '@/components/co-enabler-client';

export default function CoEnablerPortalPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-bold">Invalid co-enabler link. Session ID missing.</p>
        </div>
      </div>
    );
  }

  return <CoEnablerClient sessionId={sessionId} />;
}
