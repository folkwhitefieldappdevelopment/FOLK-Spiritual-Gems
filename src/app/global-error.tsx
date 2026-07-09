'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-[#11121d] flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1e1e2e] rounded-[3rem] p-10 text-center shadow-2xl space-y-8 border-none">
            <div className="mx-auto bg-destructive/10 p-6 rounded-full w-fit border border-destructive/20 animate-bounce-subtle">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                System Error 🚧
              </h1>
              <p className="text-sm font-bold text-slate-400 px-6">
                A critical exception occurred. We recommend restarting the application.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                  <ShieldAlert className="h-3 w-3" /> Admin Notice
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Please contact your <span className="text-[#FF9800] font-black uppercase">App Admin</span> if you see this screen repeatedly.
              </p>
            </div>

            <Button 
              onClick={() => reset()} 
              className="w-full h-16 font-black rounded-2xl bg-[#FF9800] hover:bg-[#F57C00] text-black shadow-xl text-lg transition-all hover:scale-[1.01]"
            >
              <RefreshCw className="mr-2 h-6 w-6" /> Restart App
            </Button>
            
            <p className="text-[10px] font-black text-primary opacity-50 uppercase tracking-[0.4em]">Hare Krishna!</p>
          </div>
        </div>
      </body>
    </html>
  );
}
