
'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Check, ExternalLink, Globe, AlertTriangle, CalendarCheck, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import placeholderData from '@/app/lib/placeholder-images.json';
import { cn } from '@/lib/utils';

type FreshLeadQRDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  groupId?: string;
  eventId?: string;
  eventName?: string;
};

export function FreshLeadQRDialog({ isOpen, setIsOpen, groupId, eventId, eventName }: FreshLeadQRDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [copied, setCopied] = React.useState(false);
  const [customBaseUrl, setCustomBaseUrl] = React.useState<string>('');
  const [qrType, setQrType] = React.useState<'attendance' | 'registration'>(groupId ? 'attendance' : 'registration');
  
  React.useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && !customBaseUrl) {
      setCustomBaseUrl(window.location.origin);
    }
  }, [isOpen, customBaseUrl]);

  const targetUrl = React.useMemo(() => {
    if (!appUser || !customBaseUrl) return '';
    const base = customBaseUrl.replace(/\/$/, '');
    
    if (qrType === 'attendance' && groupId) {
        if (eventId) return `${base}/check-in/event/?groupId=${groupId}&eventId=${eventId}`;
        return `${base}/check-in/?groupId=${groupId}`;
    }
    
    return `${base}/register/?id=${appUser.id}${groupId ? `&groupId=${groupId}` : ''}${eventId ? `&eventId=${eventId}` : ''}`;
  }, [appUser, customBaseUrl, groupId, eventId, qrType]);

  const handleCopy = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    toast({ title: "Link Copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: qrType === 'attendance' ? `Mark Attendance: ${eventName || 'Event'}` : 'Register for FOLK Spiritual Gems',
          url: targetUrl,
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      handleCopy();
    }
  };

  const isLocalhost = customBaseUrl.includes('localhost') || customBaseUrl.includes('cluster');
  const logo = placeholderData.app_logo;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-[#1b1d32] border-b border-white/5">
          <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Generate Outreach QR</DialogTitle>
          <DialogDescription className="text-slate-400 font-bold text-xs">
            {eventName ? `Smart link for "${eventName}"` : 'Link for attendance and automatic registration.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {groupId && (
              <Tabs value={qrType} onValueChange={(v) => setQrType(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-[#161623] border-none rounded-xl gap-1">
                      <TabsTrigger value="attendance" className="flex items-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary">
                          <CalendarCheck className="h-3.5 w-3.5 mr-1" /> Unified Flow
                      </TabsTrigger>
                      <TabsTrigger value="registration" className="flex items-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary">
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Direct Join
                      </TabsTrigger>
                  </TabsList>
              </Tabs>
          )}

          <div className="flex flex-col items-center space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-primary/5 transition-transform hover:scale-[1.02]">
              {targetUrl && (
                <QRCodeSVG 
                  value={targetUrl} 
                  size={220}
                  level="H"
                  includeMargin={true}
                  imageSettings={{ src: logo.url, height: 48, width: 48, excavate: true }}
                />
              )}
            </div>
            
            <div className="w-full space-y-4">
              <div className="text-center px-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9800] leading-relaxed">
                      {qrType === 'attendance' 
                          ? "Existing members mark attendance. New users register automatically." 
                          : "Direct registration link assigned to you."}
                  </p>
              </div>

              <div className="space-y-3 bg-[#161623] p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Public Reachout Link</Label>
                    {isLocalhost && (
                      <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] font-black animate-pulse">DEVELOPMENT LINK</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                      <Input value={targetUrl} readOnly className="bg-[#11121d] text-[11px] h-12 font-mono rounded-xl border-none shadow-inner text-white" />
                      <Button size="icon" className="h-12 w-12 shrink-0 rounded-xl bg-primary" onClick={handleCopy}>
                          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </Button>
                  </div>
              </div>

              <div className="space-y-2">
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white hover:bg-white/5">
                            <Globe className="h-3 w-3 mr-2" />
                            {isLocalhost ? 'Configure Production Domain' : 'Configure Custom Domain'}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                        <div className={cn(
                          "space-y-3 p-5 rounded-2xl border-2 border-dashed bg-white/5",
                          isLocalhost ? "border-amber-500/30" : "border-white/5"
                        )}>
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Base Domain URL</Label>
                              <Button variant="ghost" className="h-auto p-0 text-[9px] font-black text-primary uppercase" onClick={() => setCustomBaseUrl(window.location.origin)}>Reset</Button>
                            </div>
                            <Input 
                                value={customBaseUrl} 
                                onChange={(e) => setCustomBaseUrl(e.target.value)}
                                className="h-11 text-xs bg-[#11121d] border-white/5 text-white rounded-xl"
                                placeholder="https://your-app.web.app"
                            />
                            <p className="text-[9px] text-slate-400 font-bold leading-relaxed flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                {isLocalhost 
                                  ? "Note: localhost links only work on your computer. Enter your Firebase Hosting URL to share via WhatsApp."
                                  : "Ensure your domain starts with https:// for QR codes to scan properly."}
                            </p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-[#1b1d32] border-t border-white/5 sm:justify-between gap-4">
          <Button variant="ghost" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-white" onClick={() => window.open(targetUrl, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button onClick={handleShare} className="h-12 px-10 rounded-xl bg-primary font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
            <Share2 className="mr-2 h-4 w-4" /> Share Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
