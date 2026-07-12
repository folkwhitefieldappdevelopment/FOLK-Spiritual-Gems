'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Client-side redirector for legacy event-specific check-in links.
 */
export default function EventCheckInClient({ groupId, eventId }: { groupId: string, eventId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    if (groupId && eventId) {
      // Forward to the refactored event check-in route
      router.replace(`/check-in/event/?groupId=${groupId}&eventId=${eventId}`);
    }
  }, [groupId, eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Legacy Event Link
            </p>
            <p className="text-xs font-bold text-foreground">
              Synchronizing with event hub...
            </p>
        </div>
      </div>
    </div>
  );
}
