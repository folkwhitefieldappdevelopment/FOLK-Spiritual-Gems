'use client';

import * as React from 'react';
import { useBackgroundTasks } from '@/contexts/background-task-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, CheckCircle2, AlertCircle, FileDown, FileUp, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BackgroundJobsWidget() {
  const { jobs, dismissJob } = useBackgroundTasks();

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-6 z-[200] flex flex-col gap-4 pointer-events-none">
      {jobs.map(job => (
        <Card key={job.id} className="w-80 shadow-2xl pointer-events-auto animate-in slide-in-from-right-4 duration-300 rounded-[1.5rem] border-none bg-popover/95 backdrop-blur-xl">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              {job.type === 'import' ? <FileUp className="h-4 w-4 text-primary" /> : <FileDown className="h-4 w-4 text-orange-500" />}
              <CardTitle className="text-xs font-black uppercase tracking-widest truncate max-w-[180px]">
                {job.fileName}
              </CardTitle>
            </div>
            {job.status !== 'running' && (
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => dismissJob(job.id)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>
                {job.status === 'running' ? (job.type === 'import' ? 'Importing...' : 'Exporting...') : 
                 job.status === 'success' ? 'Task Complete' : 'Task Failed'}
              </span>
              <span>{Math.round((job.current / Math.max(1, job.total)) * 100)}%</span>
            </div>
            
            <Progress value={(job.current / Math.max(1, job.total)) * 100} className="h-1.5" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-foreground/60">{job.current} / {job.total}</span>
              {job.status === 'success' && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {job.errors.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[8px] font-black uppercase tracking-widest rounded-lg">
                          <List className="h-3 w-3 mr-1" /> View Errors ({job.errors.length})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="font-black uppercase tracking-tight">Import Error Log</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-80 mt-4 rounded-xl border">
                          <Table>
                            <TableHeader className="bg-muted">
                              <TableRow>
                                <TableHead className="text-[10px] font-black">Name</TableHead>
                                <TableHead className="text-[10px] font-black">Phone</TableHead>
                                <TableHead className="text-[10px] font-black">Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {job.errors.map((err, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs font-bold">{err.name}</TableCell>
                                  <TableCell className="text-xs font-mono">{err.phone}</TableCell>
                                  <TableCell className="text-xs text-destructive font-medium">{err.error}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
              {job.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
