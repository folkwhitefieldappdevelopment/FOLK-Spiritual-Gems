
'use client';

import * as React from 'react';
import type { Person } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return null;
}

export function CallHistory({ person }: { person: Person }) {
    const sortedHistory = React.useMemo(() => {
        if (!person.callHistory || !Array.isArray(person.callHistory)) return [];
        return [...person.callHistory].sort((a, b) => {
            const dateA = safeDate(a.calledAt);
            const dateB = safeDate(b.calledAt);
            if (!dateA || !dateB) return 0;
            return dateB.getTime() - dateA.getTime();
        });
    }, [person.callHistory]);

    const fullName = person.fullName || '';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Call History</CardTitle>
                <CardDescription>
                    A log of all past calls with {fullName}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    {sortedHistory.length > 0 ? (
                        <div className="space-y-6">
                            {sortedHistory.map((log, index) => (
                                <div key={index} className="space-y-2 border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-center justify-between text-sm">
                                        <p className="font-medium flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{safeDate(log.calledAt)?.toLocaleString() ?? 'N/A'}</span>
                                        </p>
                                    </div>
                                    <div className="pl-6">
                                        <p className="text-sm text-foreground">{log.remark || <span className="italic text-muted-foreground">No remark was left.</span>}</p>
                                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
                                            {log.event && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>Event: <strong className="text-foreground">{log.event}</strong></span>
                                                </div>
                                            )}
                                            {log.status && (
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span>Status: <strong className="text-foreground">{log.status}</strong></span>
                                                </div>
                                            )}
                                            {typeof log.sg === 'boolean' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span>SG: <strong className="font-semibold text-foreground">{log.sg ? 'Yes' : 'No'}</strong></span>
                                                </div>
                                            )}
                                            {typeof log.ma === 'boolean' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span>MA: <strong className="font-semibold text-foreground">{log.ma ? 'Yes' : 'No'}</strong></span>
                                                </div>
                                            )}
                                            {typeof log.frp === 'boolean' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span>FRP: <strong className="font-semibold text-foreground">{log.frp ? 'Yes' : 'No'}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No call history recorded yet.</p>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
