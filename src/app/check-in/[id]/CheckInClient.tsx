'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Client-side redirector for legacy check-in links.
 * Forwards visitors to the unified search-param based flow.
 * Reads the actual path from window.location for static compatibility with Hosting rewrites.
 */
export default function CheckInClient({ groupId }: { groupId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Extract segments from path: /check-in/ID or /check-in/ID/EVENT_ID
      // This allows the redirect to work even when served from a static placeholder (e.g. /check-in/view/index.html)
      const path = window.location.pathname;
      const checkInParts = path.split('/check-in/')[1]?.split('/').filter(Boolean);
      
      if (checkInParts && checkInParts.length > 0) {
          const id = checkInParts[0];
          const eventId = checkInParts[1];

          // Skip if it's just the static placeholders used for build generation
          if (id === 'view' || id === 'attendance') return;

          if (eventId && eventId !== 'entry' && eventId !== 'session') {
              // Legacy Event Format: /check-in/GROUP_ID/EVENT_ID
              router.replace(`/check-in/event/?groupId=${id}&eventId=${eventId}`);
          } else {
              // Legacy Group Format: /check-in/GROUP_ID
              router.replace(`/check-in/?groupId=${id}`);
          }
      } else if (groupId && groupId !== 'view' && groupId !== 'attendance') {
        // Fallback for standard routing
        router.replace(`/check-in/?groupId=${groupId}`);
      }
    }
  }, [groupId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Legacy Link Detected
            </p>
            <p className="text-xs font-bold text-foreground">
              Forwarding to registration...
            </p>
        </div>
      </div>
    </div>
  );
}
