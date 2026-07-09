'use client';

import * as React from 'react';
import { Loader2, ClipboardCheck, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getPendingCallLogs } from '@/services/call-log-service';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailedLogCallDialog } from '@/components/detailed-log-call-dialog';
import { updatePerson } from '@/services/people-service';
import { useAppToast } from '@/contexts/toast-context';
import type { CallLog } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PendingLogsPage() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      const data = await getPendingCallLogs(appUser);
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [appUser]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogSave = async (personId: string, logTimestamp: number, details: any) => {
    if (!appUser) return;
    try {
      const callLog: Partial<CallLog> = {
        calledAt: new Date(logTimestamp).toISOString(),
        remark: details.notes || '',
        status: details.outcome as any,
        event: details.eventName,
        callerId: appUser.id,
        callerName: appUser.name,
      };

      await updatePerson(personId, { 
        lastCallStatus: details.outcome as any,
        lastCallRemark: details.notes,
        lastCallAt: '__now__',
        callHistory: [callLog as CallLog] 
      }, appUser);

      toast({ title: "Milestone Logged" });
      fetchData();
    } catch (e) {
      toast({ variant: 'destructive', title: "Save Failed" });
    }
  };

  return (
    <>
      <PageHeader 
        title="Pending Logs" 
        description="Device interactions that require classification and notes."
      >
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="rounded-xl font-bold">
           <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
           Refresh
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 sm:p-6 sm:pt-0 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Checking phone sync...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-4 pb-20">
            {logs.map((log) => (
              <Card key={log.id} className="bg-[#1e1e2e] border-none shadow-xl rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-14 w-14 border-2 border-primary/20 rounded-2xl shadow-lg">
                        <AvatarImage src={log.person.photoUrl} className="object-cover" />
                        <AvatarFallback className="bg-[#161623] text-white font-black">{log.person.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-black text-white uppercase truncate">{log.person.fullName}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{log.phoneNumber}</p>
                        <div className="flex items-center gap-3 mt-2">
                           <Badge variant="outline" className="h-5 px-2 border-white/5 bg-white/5 text-[8px] font-black uppercase text-slate-500">
                              {log.type === 'INCOMING' ? <PhoneIncoming className="h-2.5 w-2.5 mr-1 text-blue-400" /> : 
                               log.type === 'MISSED' ? <PhoneMissed className="h-2.5 w-2.5 mr-1 text-red-400" /> : 
                               <PhoneOutgoing className="h-2.5 w-2.5 mr-1 text-green-400" />}
                              {log.type}
                           </Badge>
                           <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.timestamp), 'dd MMM, p')}
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right hidden xs:block">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Duration</p>
                        <p className="text-lg font-black text-white leading-none">{log.duration}s</p>
                      </div>
                      <DetailedLogCallDialog 
                        onLogCall={(details) => handleLogSave(log.person.id, log.timestamp, details)}
                        trigger={
                          <Button className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-[#FF9800] text-black shadow-xl shadow-[#FF9800]/10 hover:bg-[#F57C00]">
                            Document Now <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center space-y-6 animate-in fade-in duration-700">
             <div className="bg-green-500/10 p-8 rounded-[3rem] w-fit mx-auto border border-green-500/20 shadow-inner">
                <ClipboardCheck className="h-16 w-16 text-green-500" />
             </div>
             <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Queue is empty</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">All recent native calls have been documented.</p>
             </div>
          </div>
        )}
      </main>
    </>
  );
}