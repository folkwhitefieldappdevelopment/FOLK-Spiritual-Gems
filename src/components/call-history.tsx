
'use client';

import * as React from 'react';
import type { Person } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Call History</CardTitle>
                <CardDescription>
                    A log of all past calls with {person.firstName}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    {sortedHistory.length > 0 ? (
                        <div className="space-y-6">
                            {sortedHistory.map((log, index) => (
                                <div key={index} className="space-y-1">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{safeDate(log.calledAt)?.toLocaleString() ?? 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground pl-6">{log.remark}</p>
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
