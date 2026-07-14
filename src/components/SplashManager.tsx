'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function SplashManager({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = React.useState(true);
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    // Optimized duration: 1.2s visible + 0.4s fade out = 1.6s total app lock (down from 4.3s)
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 400);
    }, 1200); 
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <div className={cn(
          "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1b1d32] transition-opacity duration-700",
          fadeOut ? "opacity-0" : "opacity-100"
        )}>
          <div className="flex flex-col items-center gap-10">
            {/* Circular Portrait with subtle golden glow */}
            <div className="relative w-56 h-56 rounded-full overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.1)] border-2 border-[#FFD700]/10 animate-in fade-in zoom-in-95 duration-1000">
              <Image 
                src="/images/prabhupada.jpeg" 
                alt="Srila Prabhupada" 
                fill 
                className="object-cover" 
                priority 
              />
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              {/* Caption: Italic, Muted, Serif */}
              <p 
                className="italic font-serif text-[#929DD8]/80 text-base sm:text-lg animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: '600ms' }}
              >
                Humbly Dedicated to
              </p>

              {/* Title: Large, Bold, Ivory, Serif */}
              <h1 
                className="font-serif font-bold text-[#fdf6e3] text-2xl sm:text-4xl tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
                style={{ animationDelay: '1000ms' }}
              >
                Vishwa Guru Srila Prabhupada
              </h1>
            </div>
          </div>
          
          {/* Subtle footer credit */}
          <div className="absolute bottom-10 opacity-20">
             <p className="text-[#929DD8] text-[8px] font-black tracking-[0.6em] uppercase">FOLK Spiritual Gems</p>
          </div>
        </div>
      )}
      <div className={cn("min-h-screen", showSplash && !fadeOut && "hidden")}>
        {children}
      </div>
    </>
  );
}
