'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-popover border-none rounded-[3rem] shadow-2xl overflow-hidden">
        <CardHeader className="pt-12 pb-4 text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-6 rounded-full w-fit">
            <AlertTriangle className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black text-foreground tracking-tight uppercase">
              Page Missing
            </CardTitle>
            <CardDescription className="text-sm font-bold text-muted-foreground">
              The requested view could not be found.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-4 text-center">
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="w-full h-14 font-black rounded-2xl bg-[#FF9800] hover:bg-[#F57C00] text-black shadow-xl"
          >
            <Home className="mr-2 h-5 w-5" /> Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
