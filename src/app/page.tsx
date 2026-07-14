'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Root redirection page.
 * Forces navigation to the dashboard using client-side routing,
 * which is required for static exports (Android/Capacitor).
 */
export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    // TEMP: diagnostic landing page swap — revert after testing
    // Navigate to contacts after hydration
    router.replace('/contacts/');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <div className="h-16 w-16 relative bg-primary rounded-3xl shadow-xl flex items-center justify-center overflow-hidden">
             <Loader2 className="h-8 w-8 animate-spin text-white opacity-20" />
        </div>
        <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-primary tracking-tighter uppercase">FOLK GEMS</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Initializing CRM...</p>
        </div>
      </div>
    </div>
  );
}
