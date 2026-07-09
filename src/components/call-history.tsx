'use client';

import * as React from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Clock, 
  Loader2, 
  RefreshCw, 
  Calendar, 
  UserCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PlusCircle,
  CheckCircle2,
  CalendarCheck,
  BellRing
} from 'lucide-react';
import { format } from 'date-fns';
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
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const q = query(
        collection(db, 'call-logs'),
        where('phoneNumber', '==', contactPhoneNumber),
        orderBy('timestamp', 'desc'),
        limit(100) // Increased limit to show more "Old history"
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'device' }));
      setSyncedLogs(logs);
    } catch (error) {
      console.error('Failed to fetch synced logs:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [contactPhoneNumber]);

  React.useEffect(() => {
    fetchSyncedLogs();
  }, [fetchSyncedLogs]);

  const handleDetailedLog = async (logTimestamp: number, details: any) => {
    if (!appUser || !personId) return;

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

      toast({ title: "Interaction Logged", description: "Milestone has been recorded in the unified history." });
      if (onRefresh) onRefresh();
      fetchSyncedLogs(true);
    } catch (e) {
      toast({ variant: 'destructive', title: "Save Failed" });
    }
  };

  const mergedTimeline = React.useMemo(() => {
    // 1. Process Manual Logs
    const processedManual = manualHistory.map(log => ({
      ...log,
      timestamp: safeDate(log.calledAt)?.getTime() || 0,
      source: 'manual',
      id: `manual_${safeDate(log.calledAt)?.getTime()}_${log.callerId}`
    }));

    // 2. Process Attendance Records
    const processedAttendance = attendanceHistory.map(att => ({
      timestamp: safeDate(att.timestamp)?.getTime() || 0,
      source: 'attendance',
      id: `att_${att.groupId}_${att.timestamp}`,
      status: 'Z - Already Attended' as any,
      event: att.eventName || att.groupName,
      remark: `Form submitted at ${att.groupName}`,
      callerName: 'System'
    }));

    // 3. Combine everything
    const combined = [...processedManual, ...processedAttendance, ...syncedLogs];

    // 4. Deduplicate (Device logs vs Manual logs within 10 mins window)
    const merged = new Map<string, any>();
    combined.sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
      if (log.source === 'attendance') {
        merged.set(log.id, log);
        return;
      }
      
      const window = Math.floor(log.timestamp / (1000 * 60 * 10)); 
      const key = `${log.phoneNumber || contactPhoneNumber}_${window}`;
      
      if (!merged.has(key)) {
        merged.set(key, log);
      } else {
        const existing = merged.get(key);
        // Prioritize manual details over automated ones if in same window
        if (log.source === 'manual') {
            merged.set(key, { ...existing, ...log, status: log.status || existing.status });
        } else {
            merged.set(key, { ...log, ...existing });
        }
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [manualHistory, attendanceHistory, syncedLogs, contactPhoneNumber]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Building Timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Comprehensive Interaction history</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Merging device logs, manual entries & check-ins</p>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchSyncedLogs(true)} 
            disabled={isRefreshing}
            className="h-8 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-primary font-black uppercase text-[9px] tracking-widest"
        >
          <RefreshCw className={cn("h-3 w-3 mr-2", isRefreshing && "animate-spin")} />
          Sync Latest
        </Button>
      </div>

      <div className="space-y-10 border-l-2 border-muted/50 ml-4 pl-8">
        {mergedTimeline.length > 0 ? (
          mergedTimeline.map((log) => {
            const date = safeDate(log.timestamp || log.calledAt);
            const isManual = log.source === 'manual';
            const isAttendance = log.source === 'attendance';
            const isMissed = log.type === 'MISSED' || (log.source === 'device' && (log.duration || 0) < 1);
            
            return (
              <div key={log.id} className="relative group">
                {/* Timeline Node */}
                <div className={cn(
                    "absolute -left-[37px] top-1 h-3.5 w-3.5 rounded-full border-2 border-[#11121d] ring-4 ring-[#11121d] z-10 transition-all shadow-lg",
                    isAttendance ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]" :
                    isManual ? "bg-primary shadow-[0_0_12px_rgba(63,81,181,0.4)]" : 
                    isMissed ? "bg-red-500" : "bg-slate-700"
                )} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-white/90 uppercase tracking-tighter">
                            {date ? format(date, 'dd MMM yyyy, p') : 'Unknown Date'}
                        </span>
                        {log.source === 'device' && (
                            <Badge variant="outline" className="h-5 px-2 border-white/5 bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500">
                                {log.type === 'INCOMING' ? <PhoneIncoming className="h-2.5 w-2.5 mr-1 text-blue-400" /> : 
                                 isMissed ? <PhoneMissed className="h-2.5 w-2.5 mr-1 text-red-400" /> : 
                                 <PhoneOutgoing className="h-2.5 w-2.5 mr-1 text-green-400" />}
                                {log.type}
                            </Badge>
                        )}
                    </div>
                    {log.status && (
                        <Badge variant="secondary" className={cn(
                          "text-[9px] font-black uppercase h-6 border-none px-3 rounded-lg",
                          isAttendance ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                        )}>
                            {log.status}
                        </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {log.event && (
                        <div className="flex items-center gap-2">
                            {isAttendance ? <CalendarCheck className="h-3 w-3 text-green-500" /> : <Calendar className="h-3 w-3 text-muted-foreground opacity-40" />}
                            <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isAttendance ? "text-green-500/80" : "text-slate-500"
                            )}>
                                Event: {log.event}
                            </span>
                        </div>
                    )}

                    {log.nextFollowUpAt && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl w-fit">
                            <BellRing className="h-3 w-3 text-accent" />
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-accent">
                                Reminder: {format(new Date(log.nextFollowUpAt), 'dd MMM, HH:mm')}
                            </span>
                        </div>
                    )}
                  </div>

                  {log.remark ? (
                    <div className={cn(
                      "p-4 rounded-[1.5rem] border relative transition-all group-hover:scale-[1.01]",
                      isAttendance ? "bg-green-500/5 border-green-500/10" : "bg-white/5 border-white/5 shadow-xl"
                    )}>
                        <p className="text-xs sm:text-sm font-bold text-slate-300 leading-relaxed italic">
                            "{log.remark}"
                        </p>
                        {log.callerName && (
                            <p className="text-[10px] font-black text-slate-500 uppercase mt-3 text-right tracking-[0.2em]">
                                — Logged by {log.callerName}
                            </p>
                        )}
                    </div>
                  ) : log.source === 'device' ? (
                    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-[#1e1e2e]/50 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[11px] font-bold text-slate-500">
                                Call duration: {log.duration || 0} seconds
                            </span>
                        </div>
                        <DetailedLogCallDialog 
                            onLogCall={(details) => handleDetailedLog(log.timestamp, details)}
                            trigger={
                                <Button size="sm" className="h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg">
                                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Log Milestone
                                </Button>
                            }
                        />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5 mx-2">
            <History className="h-12 w-12 mx-auto mb-4 text-slate-500 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">No interaction history found</p>
          </div>
        )}
      </div>
    </div>
  );
}