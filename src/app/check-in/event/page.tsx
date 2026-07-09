'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import EventCheckInClient from '@/components/event-check-in-client';

/**
 * Static-compatible Event Check-in Page.
 * Usage: /check-in/event/?groupId=XYZ&eventId=ABC
 */
export default function EventCheckInPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  const eventId = searchParams.get('eventId');

  if (!groupId || !eventId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#11121d]">
        <div className="text-center space-y-4">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Invalid event link parameters.</p>
        </div>
      </div>
    );
  }

  return <EventCheckInClient groupId={groupId} eventId={eventId} />;
}
