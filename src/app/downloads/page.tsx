'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  ArrowLeft, 
  Share2, 
  CheckCircle2,
  FileDown,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InstallPwaButton } from '@/components/install-pwa-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function DownloadsPage() {
  const router = useRouter();
  const [appUrl, setAppUrl] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  const logo = placeholderData.app_logo;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader 
          title="Download Center" 
          description="Get the FOLK Gems app on your mobile device."
        >
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9 font-bold border-border text-foreground bg-muted/50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </PageHeader>

        <main className="flex-1 p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <Card className="bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="p-8 pb-4 text-center">
                <div className="bg-primary/10 p-4 rounded-3xl w-fit mx-auto mb-6 border border-primary/20">
                  <Smartphone className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Quick Install (Web)</CardTitle>
                <CardDescription className="font-bold text-muted-foreground">The fastest way to get the app on your home screen.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-2xl border border-border">
                    <Zap className="h-5 w-5 text-yellow-500 shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-foreground">Instant Updates</p>
                      <p className="text-xs text-muted-foreground font-medium">No store downloads needed. App updates automatically every time you open it.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-2xl border border-border">
                    <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-foreground">Privacy First</p>
                      <p className="text-xs text-muted-foreground font-medium">Runs securely in your browser's isolated environment.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <InstallPwaButton />
                </div>

                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                   <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-center">
                     Best for: Regular daily use & Team members
                   </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-popover border-none rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <CardHeader className="p-8 pb-4 text-center">
                <div className="bg-accent/10 p-4 rounded-3xl w-fit mx-auto mb-6 border border-accent/20">
                  <Share2 className="h-10 w-10 text-accent-foreground" />
                </div>
                <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Scan to Open</CardTitle>
                <CardDescription className="font-bold text-muted-foreground">Open this portal on your phone to start the installation.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 flex flex-col items-center space-y-8">
                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-primary/5">
                  {appUrl && (
                    <QRCodeSVG 
                      value={appUrl} 
                      size={180}
                      level="H"
                      includeMargin={true}
                      imageSettings={{ src: logo.url, height: 32, width: 32, excavate: true }}
                    />
                  )}
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">Share this link</p>
                  <p className="text-[10px] font-mono text-muted-foreground break-all bg-muted p-3 rounded-xl border border-border">{appUrl}</p>
                </div>

                <div className="w-full space-y-3">
                  <Alert className="bg-muted/20 border-border rounded-2xl">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-xs font-black text-foreground uppercase">Pro Tip</AlertTitle>
                    <AlertDescription className="text-[11px] text-muted-foreground">
                      If you are an Admin, you can upload your compiled <b>Android APK</b> to Firebase Storage and add a download button here.
                    </AlertDescription>
                  </Alert>
                  
                  <Button variant="outline" className="w-full h-12 rounded-xl border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 font-bold text-xs" disabled>
                    <FileDown className="mr-2 h-4 w-4" /> Download APK (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

          <footer className="mt-20 pb-12 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px]">
              <CheckCircle2 className="h-3 w-3" /> Offline Ready
            </div>
            <p className="text-muted-foreground text-xs font-medium max-w-md">
              FOLK Gems uses advanced caching technology to ensure you can log calls and view contacts even when your internet is disconnected.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
