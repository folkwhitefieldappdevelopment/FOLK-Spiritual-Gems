'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import RegistrationClient from '@/components/registration-client';

/**
 * Static-compatible Registration Page.
 * Uses search parameters instead of dynamic route segments to support Next.js output: export.
 */
export default function RegisterPage() {
  const searchParams = useSearchParams();
  // Support 'id' or 'guideId' as search parameters
  const guideId = searchParams.get('id') || searchParams.get('guideId');

  if (!guideId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#11121d]">
        <div className="text-center space-y-4">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Invalid registration link. Guide ID missing.</p>
        </div>
      </div>
    );
  }

  return <RegistrationClient initialGuideId={guideId} />;
}
