'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    if (error) {
        const msg = error.message || 'Unknown application error';
        console.error('Next.js Runtime Error:', msg, error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-popover border-none rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="pt-12 pb-4 text-center space-y-4">
          <div className="mx-auto bg-destructive/10 p-6 rounded-full w-fit border border-destructive/20">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black text-foreground tracking-tight leading-none uppercase">
              Oops! 🚧
            </CardTitle>
            <CardDescription className="text-sm font-bold text-muted-foreground px-6">
              A temporary runtime exception occurred. Your outreach data is safe in the cloud.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-4 text-center space-y-8">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                <ShieldAlert className="h-3 w-3" /> System Notice
            </div>
            <p className="text-xs text-foreground/80 font-medium leading-relaxed">
              Please try refreshing. If this persists, the database may be busy syncing your large contact list.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => reset()} 
              className="w-full h-14 font-black rounded-2xl bg-[#FF9800] hover:bg-[#F57C00] text-black shadow-xl text-lg transition-all"
            >
              <RefreshCw className="mr-2 h-5 w-5" /> Retry Now
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')} 
              className="w-full h-12 font-bold text-muted-foreground hover:text-foreground"
            >
              <Home className="mr-2 h-4 w-4" /> Return to Dashboard
            </Button>
          </div>
          
          <p className="text-[10px] font-black text-primary opacity-50 uppercase tracking-[0.4em]">Hare Krishna!</p>
        </CardContent>
      </Card>
    </div>
  );
}
