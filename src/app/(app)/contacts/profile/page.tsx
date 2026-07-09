'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import PersonDetailClient from '@/components/person-detail-client';

export default function ContactProfilePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-bold">No contact ID provided.</p>
        </div>
      </div>
    );
  }

  return <PersonDetailClient personId={id} />;
}
