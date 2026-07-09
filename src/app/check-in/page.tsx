'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import CheckInClient from '@/components/check-in-client';

/**
 * Static-compatible Check-in Page.
 * Accesses groupId via search params: /check-in/?groupId=XYZ
 */
export default function CheckInPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || searchParams.get('id');

  if (!groupId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#11121d]">
        <div className="text-center space-y-4">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No group ID provided for check-in.</p>
        </div>
      </div>
    );
  }

  return <CheckInClient groupId={groupId} />;
}
