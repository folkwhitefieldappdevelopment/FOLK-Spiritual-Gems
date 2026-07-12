'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Client-side redirector for legacy check-in links.
 * Forwards visitors to the unified search-param based flow.
 */
export default function CheckInClient({ groupId }: { groupId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    if (groupId) {
      // Redirect to the current working unified flow location
      router.replace(`/check-in/?groupId=${groupId}`);
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
