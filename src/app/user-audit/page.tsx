
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAudits, type AuditLog } from '@/services/audit-service';
import { format } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Search } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { safeDate } from '@/utils/date';

export default function UserAuditPage() {
  const { appUser } = useAuth();
  const [audits, setAudits] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  React.useEffect(() => {
    if (appUser) {
      const fetchData = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
          const auditData = await getAudits();
          setAudits(auditData);
        } catch (error) {
          console.error("Failed to fetch audit logs:", error);
          if (error instanceof Error) {
            setFetchError(error);
          } else {
            setFetchError(new Error("An unknown error occurred while fetching audit logs."));
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [appUser]);
  
  const filteredAudits = React.useMemo(() => {
    return audits.filter(audit => {
      const searchInput = searchTerm.toLowerCase();
      const searchMatch = searchInput
        ? audit.userName.toLowerCase().includes(searchInput) ||
          audit.action.toLowerCase().includes(searchInput) ||
          audit.details.toLowerCase().includes(searchInput)
        : true;
        
      const from = dateRange?.from ? startOfDay(dateRange.from) : null;
      const to = dateRange?.to ? endOfDay(dateRange.to) : null;
      
      let auditDate = safeDate(audit.timestamp);
      if(!auditDate) return false;
      
      let dateMatch = true;
      if (from && to) {
        dateMatch = auditDate >= from && auditDate <= to;
      } else if (from) {
        dateMatch = auditDate >= from;
      }

      return searchMatch && dateMatch;
    });
  }, [audits, searchTerm, dateRange]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (fetchError) {
      return <FirebaseConfigError error={fetchError} />;
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                    A log of all important activities performed by users. Found {filteredAudits.length} records.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by user, action, or details..."
                            className="pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[180px]">Action</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAudits.length > 0 ? (
                                filteredAudits.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(safeDate(log.timestamp)!, 'PPpp')}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.userName}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold">{log.action}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">{log.details}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No audit logs found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader
          title="User Audit Log"
          description="Track key activities performed in the application."
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
