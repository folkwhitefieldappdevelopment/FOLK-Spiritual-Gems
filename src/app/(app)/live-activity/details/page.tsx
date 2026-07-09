'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import SessionDetailsClient from '@/components/session-details-client';

export default function LiveSessionDetailsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#11121d]">
        <div className="text-center space-y-4">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Invalid session ID provided.</p>
        </div>
      </div>
    );
  }

  return <SessionDetailsClient sessionId={id} />;
}