'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink } from 'lucide-react';
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

export function FreshLeadQRDialog({ isOpen, setIsOpen, groupId, eventId, eventName }: { isOpen: boolean, setIsOpen: (o:boolean)=>void, groupId?:string, eventId?:string, eventName?:string }) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [copied, setCopied] = React.useState(false);
  const [customBaseUrl, setCustomBaseUrl] = React.useState<string>('');
  const [qrType, setQrType] = React.useState<'attendance' | 'registration'>(groupId ? 'attendance' : 'registration');
  
  React.useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && !customBaseUrl) setCustomBaseUrl(window.location.origin);
  }, [isOpen, customBaseUrl]);

  const targetUrl = React.useMemo(() => {
    if (!appUser || !customBaseUrl) return '';
    const base = customBaseUrl.replace(/\/$/, '');
    if (qrType === 'attendance' && groupId) return eventId ? `${base}/check-in/event/?groupId=${groupId}&eventId=${eventId}` : `${base}/check-in/?groupId=${groupId}`;
    return `${base}/register/?id=${appUser.id}${groupId ? `&groupId=${groupId}` : ''}`;
  }, [appUser, customBaseUrl, groupId, eventId, qrType]);

  const handleCopy = () => { 
    if (!targetUrl) return; 
    try {
      navigator.clipboard.writeText(targetUrl)
        .then(() => {
          setCopied(true); 
          toast({ title: "Link Copied" }); 
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast({ variant: 'destructive', title: "Copy Failed", description: "Please copy the link manually from the input field." });
        });
    } catch (e) {
      toast({ variant: 'destructive', title: "Copy Failed", description: "Clipboard access is restricted." });
    }
  };

  const logo = placeholderData.app_logo;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-card border-b border-border">
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Generate Outreach QR</DialogTitle>
          <DialogDescription className="text-muted-foreground font-bold text-xs">{eventName ? `Smart link for "${eventName}"` : 'Link for outreach.'}</DialogDescription>
        </DialogHeader>
        <div className="p-8 space-y-6">
          {groupId && (
              <Tabs value={qrType} onValueChange={(v) => setQrType(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted border-none rounded-xl gap-1">
                      <TabsTrigger value="attendance" className="flex items-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary">Unified Flow</TabsTrigger>
                      <TabsTrigger value="registration" className="flex items-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary">Direct Join</TabsTrigger>
                  </TabsList>
              </Tabs>
          )}
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-primary/5">{targetUrl && (<QRCodeSVG value={targetUrl} size={220} level="H" includeMargin={true} imageSettings={{ src: logo.url, height: 48, width: 48, excavate: true }} />)}</div>
            <div className="w-full space-y-4">
              <div className="space-y-3 bg-muted p-6 rounded-3xl border border-border">
                  <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black">Public Reachout Link</Label>
                  <div className="flex gap-2"><Input value={targetUrl} readOnly className="bg-background text-[11px] h-12 font-mono rounded-xl border-none shadow-inner text-foreground" /><Button size="icon" className="h-12 w-12 shrink-0 rounded-xl bg-primary" onClick={handleCopy}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button></div>
              </div>
              <Collapsible><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Configure Domain</Button></CollapsibleTrigger><CollapsibleContent className="pt-3"><div className="space-y-3 p-5 rounded-2xl border-2 border-dashed bg-muted/20 border-border"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Domain URL</Label><Input value={customBaseUrl} onChange={e => setCustomBaseUrl(e.target.value)} className="h-11 text-xs bg-background border-border text-foreground rounded-xl" /></div></CollapsibleContent></Collapsible>
            </div>
          </div>
        </div>
        <DialogFooter className="p-8 bg-card border-t border-border sm:justify-between gap-4"><Button variant="ghost" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:text-foreground" onClick={() => window.open(targetUrl, '_blank')}><ExternalLink className="mr-2 h-4 w-4" /> Preview</Button><Button onClick={() => { if(navigator.share) navigator.share({url: targetUrl}); else handleCopy(); }} className="h-12 px-10 rounded-xl bg-primary font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">Share Flow</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
