'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  Calendar, 
  User, 
  Loader2, 
  ClipboardCheck,
  History,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getPendingCallLogs } from '@/services/call-log-service';
import { updatePerson } from '@/services/people-service';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppToast } from '@/contexts/toast-context';
import { formatDuration } from '@/utils/format';
import { DetailedLogCallDialog } from '@/components/detailed-log-call-dialog';
import { format } from 'date-fns';
import type { CallLog } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PendingLogsPage() {
    const { appUser } = useAuth();
    const { toast } = useAppToast();
    const router = useRouter();
    
    const [pendingLogs, setPendingLogs] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const fetchLogs = React.useCallback(async (silent = false) => {
        if (!appUser) return;
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);
        
        try {
            const logs = await getPendingCallLogs(appUser);
            setPendingLogs(logs);
        } catch (e) {
            console.error("Failed to fetch pending logs", e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [appUser]);

    React.useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleLogCall = async (personId: string, logTimestamp: number, details: any) => {
        if (!appUser) return;
        try {
            const callLog: Partial<CallLog> = {
                calledAt: new Date(logTimestamp).toISOString(),
                remark: details.notes || '',
                status: details.outcome as any,
                event: details.eventName,
                callerId: appUser.id,
                callerName: appUser.name,
                callerPhotoUrl: appUser.photoUrl || '',
            };

            await updatePerson(personId, {
                lastCallStatus: details.outcome as any,
                lastCallRemark: details.notes,
                lastCallAt: '__now__',
                callHistory: [callLog as CallLog]
            }, appUser);

            toast({ title: "Interaction Documented" });
            fetchLogs(true); // Silently refresh the list
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to save details" });
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#11121d]">
            <AppSidebar />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <PageHeader 
                    title="Pending Documentation" 
                    description="Clear your documentation queue for direct phone calls."
                >
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchLogs(true)} 
                        disabled={isLoading || isRefreshing}
                        className="h-9 px-4 rounded-xl border-white/10 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
                        Sync Latest
                    </Button>
                </PageHeader>

                <main className="flex-1 p-4 sm:p-6 sm:pt-0">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-50">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Cross-referencing logs...</p>
                            </div>
                        ) : pendingLogs.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {pendingLogs.map((log) => (
                                    <Card key={log.id} className="bg-[#1e1e2e] border-none rounded-[2rem] overflow-hidden shadow-2xl hover:shadow-primary/5 transition-all group">
                                        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                                <div className="relative">
                                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-[#161623] shadow-xl rounded-3xl">
                                                        <AvatarImage src={log.person.photoUrl} className="object-cover" />
                                                        <AvatarFallback className="bg-[#161623] text-primary font-black text-xl">{log.person.fullName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-[#1e1e2e] flex items-center justify-center shadow-lg",
                                                        log.type === 'INCOMING' ? "bg-blue-500" : log.type === 'OUTGOING' ? "bg-green-500" : "bg-red-500"
                                                    )}>
                                                        {log.type === 'INCOMING' ? <PhoneIncoming className="h-3.5 w-3.5 text-white" /> : 
                                                         log.type === 'OUTGOING' ? <PhoneOutgoing className="h-3.5 w-3.5 text-white" /> : 
                                                         <PhoneMissed className="h-3.5 w-3.5 text-white" />}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight truncate leading-none">
                                                        {log.person.fullName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[11px] font-black text-primary/80 tracking-widest">{log.phoneNumber}</span>
                                                        <Badge className="bg-white/5 text-slate-500 border-none font-bold text-[9px] h-5 px-2">
                                                            {log.person.currentFolkStage}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(log.timestamp), 'dd MMM, p')}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDuration(log.duration)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                                                <Button 
                                                    variant="ghost" 
                                                    className="flex-1 sm:flex-none h-12 px-6 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5"
                                                    onClick={() => router.push(`/contacts/profile?id=${log.person.id}`)}
                                                >
                                                    Profile
                                                </Button>
                                                <DetailedLogCallDialog 
                                                    onLogCall={(details) => handleLogCall(log.person.id, log.timestamp, details)}
                                                    trigger={
                                                        <Button className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
                                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                                            Log Milestone
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5 mx-4">
                                <CheckCircle2 className="h-16 w-16 mx-auto mb-6 text-green-500 opacity-20" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Queue Clear!</h3>
                                <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">
                                    All native phone calls have been Documented. Your documentation pulse is 100%.
                                </p>
                                <Button 
                                    onClick={() => router.push('/dashboard')}
                                    variant="ghost"
                                    className="mt-8 text-primary font-black uppercase text-[10px] tracking-widest"
                                >
                                    Return to Dashboard
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
