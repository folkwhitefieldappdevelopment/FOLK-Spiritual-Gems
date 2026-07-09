'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import GroupDetailClient from '@/components/group-detail-client';

export default function GroupDetailsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-bold">No group ID provided.</p>
        </div>
      </div>
    );
  }

  return <GroupDetailClient groupId={id} />;
}
