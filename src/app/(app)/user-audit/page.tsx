'use client';

import * as React from 'react';
import { Loader2, History, RefreshCw, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { getAudits, type AuditLog } from '@/services/audit-service';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UserAuditPage() {
  const [audits, setAudits] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAudits();
      setAudits(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <PageHeader 
        title="Audit Trail" 
        description="Monitor system-wide actions and database changes."
      >
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="rounded-xl font-bold">
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 sm:p-6 sm:pt-0">
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-[#1e1e2e]">
          <CardHeader className="p-8 pb-4 bg-[#1b1d32] border-b border-white/5">
            <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Security Logs
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              Last 100 operations across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 pl-8">Timestamp</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Operator</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Action</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={i} className="border-white/5"><TableCell colSpan={4} className="h-12"><div className="h-4 w-full bg-white/5 animate-pulse rounded" /></TableCell></TableRow>
                    ))
                  ) : audits.length > 0 ? (
                    audits.map((log) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="pl-8 py-5 text-[11px] font-mono text-slate-400">
                          {format(new Date(log.timestamp), 'dd MMM, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-slate-600" />
                            <span className="text-xs font-black text-white uppercase truncate max-w-[120px]">{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[9px] uppercase">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-300 pr-8">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No audit records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

import { cn } from '@/lib/utils';