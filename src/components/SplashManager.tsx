'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function SplashManager({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = React.useState(true);
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 800);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <div className={cn(
          "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1b1d32] transition-opacity duration-700",
          fadeOut ? "opacity-0" : "opacity-100"
        )}>
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="relative w-32 h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <Image src="https://picsum.photos/seed/gems/200/200" alt="Logo" fill className="object-cover" />
            </div>
            <h1 className="text-white text-2xl font-black tracking-tighter uppercase">FOLK GEMS</h1>
            <p className="text-primary text-[10px] font-black tracking-[0.4em] mt-2">OFFLINE READY</p>
          </div>
        </div>
      )}
      <div className={cn("min-h-screen", showSplash && !fadeOut && "hidden")}>
        {children}
      </div>
    </>
  );
}
