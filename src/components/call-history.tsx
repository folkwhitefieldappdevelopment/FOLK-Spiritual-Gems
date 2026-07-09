'use client';

import * as React from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Loader2, 
  RefreshCw, 
  Calendar, 
  UserCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PlusCircle,
  CalendarCheck,
  BellRing,
  History
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { safeDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { CallLog, Person, AttendanceEntry } from '@/lib/types';
import { DetailedLogCallDialog } from './detailed-log-call-dialog';
import { useAuth } from '@/contexts/auth-context';
import { updatePerson } from '@/services/people-service';
import { useToast } from '@/hooks/use-toast';

interface CallHistoryProps {
  personId: string;
  contactPhoneNumber: string;
  userId: string;
  manualHistory?: CallLog[];
  attendanceHistory?: AttendanceEntry[];
  onRefresh?: () => void;
}

export function CallHistory({ personId, contactPhoneNumber, userId, manualHistory = [], attendanceHistory = [], onRefresh }: CallHistoryProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [syncedLogs, setSyncedLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchSyncedLogs = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setIsRefreshing(true);
    try {
      const q = query(collection(db, 'call-logs'), where('phoneNumber', '==', contactPhoneNumber), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      setSyncedLogs(snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'device' })));
    } finally { setLoading(false); setIsRefreshing(false); }
  }, [contactPhoneNumber]);

  React.useEffect(() => { fetchSyncedLogs(); }, [fetchSyncedLogs]);

  const handleDetailedLog = async (logTimestamp: number, details: any) => {
    if (!appUser || !personId) return;
    try {
      const callLog: Partial<CallLog> = { calledAt: new Date(logTimestamp).toISOString(), remark: details.notes || '', status: details.outcome as any, event: details.eventName, callerId: appUser.id, callerName: appUser.name };
      await updatePerson(personId, { lastCallStatus: details.outcome as any, lastCallRemark: details.notes, lastCallAt: '__now__', callHistory: [callLog as CallLog] }, appUser);
      toast({ title: "Interaction Logged" });
      if (onRefresh) onRefresh();
      fetchSyncedLogs(true);
    } catch (e) { toast({ variant: 'destructive', title: "Save Failed" }); }
  };

  const mergedTimeline = React.useMemo(() => {
    const combined = [...manualHistory.map(l => ({ ...l, timestamp: safeDate(l.calledAt)?.getTime() || 0, source: 'manual', id: `m_${safeDate(l.calledAt)?.getTime()}_${l.callerId}` })), ...attendanceHistory.map(a => ({ timestamp: safeDate(a.timestamp)?.getTime() || 0, source: 'attendance', id: `a_${a.groupId}_${a.timestamp}`, status: 'Z - Already Attended' as any, event: a.eventName || a.groupName, remark: `Form submitted at ${a.groupName}`, callerName: 'System' })), ...syncedLogs];
    const merged = new Map<string, any>();
    combined.sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
      if (log.source === 'attendance') { merged.set(log.id, log); return; }
      const key = `${log.phoneNumber || contactPhoneNumber}_${Math.floor(log.timestamp / 600000)}`;
      if (!merged.has(key)) merged.set(key, log);
      else { const ex = merged.get(key); if (log.source === 'manual') merged.set(key, { ...ex, ...log }); else merged.set(key, { ...log, ...ex }); }
    });
    return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [manualHistory, attendanceHistory, syncedLogs, contactPhoneNumber]);

  if (loading) return <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Building Timeline...</p></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1"><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Interaction history</h3><p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Merged Timeline</p></div>
        <Button variant="outline" size="sm" onClick={() => fetchSyncedLogs(true)} disabled={isRefreshing} className="h-8 rounded-xl border-border bg-muted/50 text-primary font-black text-[9px] uppercase tracking-widest"><RefreshCw className={cn("h-3 w-3 mr-2", isRefreshing && "animate-spin")} />Sync Latest</Button>
      </div>
      <div className="space-y-10 border-l-2 border-border ml-4 pl-8">
        {mergedTimeline.length > 0 ? mergedTimeline.map((log) => {
          const date = safeDate(log.timestamp || log.calledAt);
          const isManual = log.source === 'manual', isAttendance = log.source === 'attendance';
          return (
            <div key={log.id} className="relative group">
              <div className={cn("absolute -left-[37px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background ring-4 ring-background z-10 transition-all shadow-lg", isAttendance ? "bg-green-500" : isManual ? "bg-primary" : "bg-muted-foreground")} />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4"><span className="text-[11px] font-black text-foreground/90 uppercase">{date ? format(date, 'dd MMM yyyy, p') : 'Unknown'}</span>{log.source === 'device' && <Badge variant="outline" className="h-5 px-2 border-border bg-muted/50 text-[8px] font-black uppercase text-muted-foreground">{log.type}</Badge>}{log.status && <Badge variant="secondary" className={cn("text-[9px] font-black uppercase border-none", isAttendance ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary")}>{log.status}</Badge>}</div>
                <div className="flex flex-col gap-2">{log.event && <div className="flex items-center gap-2">{isAttendance ? <CalendarCheck className="h-3 w-3 text-green-500" /> : <Calendar className="h-3 w-3 text-muted-foreground opacity-40" />}<span className={cn("text-[10px] font-black uppercase tracking-widest", isAttendance ? "text-green-500" : "text-muted-foreground")}>Event: {log.event}</span></div>}</div>
                {log.remark ? <div className={cn("p-4 rounded-[1.5rem] border relative", isAttendance ? "bg-green-500/5 border-green-500/10" : "bg-muted/30 border-border")}><p className="text-xs sm:text-sm font-bold text-foreground/80 italic">"{log.remark}"</p>{log.callerName && <p className="text-[10px] font-black text-muted-foreground uppercase mt-3 text-right">— {log.callerName}</p>}</div> : log.source === 'device' ? <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-dashed border-border"><span className="text-[11px] font-bold text-muted-foreground">Duration: {log.duration || 0}s</span><DetailedLogCallDialog onLogCall={d => handleDetailedLog(log.timestamp, d)} trigger={<Button size="sm" className="h-8 px-4 text-[9px] font-black uppercase tracking-widest">Log Milestone</Button>} /></div> : null}
              </div>
            </div>
          );
        }) : <div className="py-24 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border mx-2"><History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" /><p className="text-[10px] font-black uppercase text-muted-foreground">No interactions found</p></div>}
      </div>
    </div>
  );
}