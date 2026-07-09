'use client';

import * as React from 'react';
import { Loader2, ChevronDown, ListChecks } from 'lucide-react';
import type { Person, AppUser } from '@/lib/types';
import { useAppToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getUnassignedPeople, assignEnablerToPeople } from '@/services/people-service';
import { getAssignableUsersForAssignments } from '@/services/user-service';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function AssignmentsPage() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const router = useRouter();

  const [unassignedPeople, setUnassignedPeople] = React.useState<Person[]>([]);
  const [totalPeople, setTotalPeople] = React.useState(0);
  const [enablerStats, setEnablerStats] = React.useState<Record<string, number>>({});

  const [assignableUsers, setAssignableUsers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [selectedContactIds, setSelectedContactIds] = React.useState<Set<string>>(new Set());
  const [selectedEnablerId, setSelectedEnablerId] = React.useState<string>('');
  
  const [rangeFrom, setRangeFrom] = React.useState("1");
  const [rangeTo, setRangeTo] = React.useState("60");

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      const { people: peopleData, totalCount, enablerStats: stats } = await getUnassignedPeople(appUser);
      const usersToAssign = await getAssignableUsersForAssignments(appUser);
      
      setUnassignedPeople(peopleData);
      setTotalPeople(totalCount);
      setEnablerStats(stats);
      setAssignableUsers(usersToAssign.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [appUser]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleAssign = async () => {
    if (selectedContactIds.size === 0 || !selectedEnablerId) {
      toast({ variant: 'destructive', title: 'Selection required', description: 'Please select contacts and an enabler.' });
      return;
    }
    const enabler = assignableUsers.find(e => e.id === selectedEnablerId);
    if (!enabler || !appUser) return;

    try {
      await assignEnablerToPeople(Array.from(selectedContactIds), enabler, appUser);
      toast({ title: 'Contacts Assigned', description: `${selectedContactIds.size} contacts were assigned to ${enabler.name}.` });
      fetchData();
      setSelectedContactIds(new Set());
      setSelectedEnablerId('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Assignment Failed' });
    }
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = new Set(unassignedPeople.map(p => p.id));
      setSelectedContactIds(prev => new Set([...Array.from(prev), ...Array.from(pageIds)]));
    } else {
      const pageIds = new Set(unassignedPeople.map(p => p.id));
      setSelectedContactIds(prev => {
          const newSet = new Set(prev);
          pageIds.forEach(id => newSet.delete(id));
          return newSet;
      });
    }
  };

  const handleSelectRange = (fromStr: string, toStr: string) => {
    const from = parseInt(fromStr);
    const to = parseInt(toStr);
    if (isNaN(from) || isNaN(to)) return;
    const start = Math.max(0, from - 1);
    const end = Math.min(unassignedPeople.length, to);
    if (start >= end) return;
    const idsToSelect = unassignedPeople.slice(start, end).map(p => p.id);
    setSelectedContactIds(new Set(idsToSelect));
  };

  return (
    <>
        <PageHeader
          title="Contact Assignments"
          description="Assign unassigned contacts to available enablers."
        />
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:px-6 sm:py-0">
          <Card className="lg:col-span-1 flex flex-col max-h-[calc(100vh-140px)]">
            <CardHeader>
              <CardTitle>Enablers</CardTitle>
              <CardDescription>List of available enablers and their current contact count.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4 -mr-4">
                <div className="space-y-4">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="p-3 border rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-12" />
                        </div>
                    ))
                  ) : assignableUsers.map(enabler => (
                    <div key={enabler.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={enabler.photoUrl} alt={enabler.name} />
                            <AvatarFallback>{enabler.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{enabler.name}</p>
                          <div className="text-xs text-muted-foreground">
                              {(enabler.role || []).includes('Folk Enabler') && <Badge variant="outline" className="mr-1">Enabler</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{enablerStats[enabler.name] || 0}</p>
                        <p className="text-xs text-muted-foreground">contacts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col overflow-hidden max-h-[calc(100vh-140px)]">
            <CardHeader className="shrink-0">
              <CardTitle>Unassigned Contacts ({isLoading ? '...' : unassignedPeople.length})</CardTitle>
              <CardDescription>Select contacts from this list to assign them to an enabler.</CardDescription>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex items-center gap-2 flex-1">
                  <Select value={selectedEnablerId} onValueChange={setSelectedEnablerId}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={selectedContactIds.size === 0 || !selectedEnablerId}>
                    Assign
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
              <div className="border-t overflow-hidden flex flex-col flex-1">
                <ScrollArea className="flex-1 h-full">
                  <div className="overflow-x-auto scrollbar-hide">
                    <Table className="min-w-[600px] sm:min-w-full">
                        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-[50px] sm:w-[100px] px-2 sm:px-4">
                              <div className="flex items-center gap-1">
                                <Checkbox 
                                    onCheckedChange={handleSelectAllOnPage}
                                    checked={unassignedPeople.length > 0 && unassignedPeople.every(p => selectedContactIds.has(p.id))}
                                />
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                      <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-4" align="start">
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2">
                                        <ListChecks className="h-4 w-4 text-primary" />
                                        <h4 className="font-bold text-sm">Bulk Selection</h4>
                                      </div>
                                      <div className="grid gap-3">
                                        <Button variant="outline" size="sm" className="justify-start font-bold" onClick={() => handleSelectAllOnPage(true)}>
                                          Select All ({unassignedPeople.length})
                                        </Button>
                                        
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Range (Serial #)</Label>
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 space-y-1">
                                              <Label htmlFor="assign-from" className="text-[9px] uppercase opacity-70">From</Label>
                                              <Input 
                                                id="assign-from"
                                                type="number" 
                                                value={rangeFrom}
                                                onChange={(e) => setRangeFrom(e.target.value)}
                                                className="h-8 text-xs" 
                                              />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                              <Label htmlFor="assign-to" className="text-[9px] uppercase opacity-70">To</Label>
                                              <Input 
                                                id="assign-to"
                                                type="number" 
                                                value={rangeTo}
                                                onChange={(e) => setRangeTo(e.target.value)}
                                                className="h-8 text-xs" 
                                              />
                                            </div>
                                            <Button 
                                              size="sm" 
                                              className="h-8 self-end font-bold text-xs"
                                              onClick={() => handleSelectRange(rangeFrom, rangeTo)}
                                            >
                                              Select
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableHead>
                            <TableHead className="w-[30px] px-1 sm:px-2 text-center text-[9px] sm:text-[10px] font-black uppercase">#</TableHead>
                            <TableHead className="w-[120px] sm:min-w-[180px] px-2 sm:px-4 text-[11px] sm:text-sm whitespace-nowrap">
                              Name
                            </TableHead>
                            <TableHead className="px-2 sm:px-4 text-[11px] sm:text-sm whitespace-nowrap">
                              Phone
                            </TableHead>
                            <TableHead className="px-2 sm:px-4 text-[11px] sm:text-sm whitespace-nowrap">
                              Source
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            [...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="px-2 sm:px-4"><Skeleton className="h-4 w-4" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                </TableRow>
                            ))
                          ) : unassignedPeople.length > 0 ? (
                            unassignedPeople.map((person, index) => (
                              <TableRow key={person.id}
                                  data-state={selectedContactIds.has(person.id) ? "selected" : undefined}
                              >
                                <TableCell className="px-2 sm:px-4">
                                  <Checkbox
                                      checked={selectedContactIds.has(person.id)}
                                      onCheckedChange={(checked) => {
                                          setSelectedContactIds(prev => {
                                              const newSet = new Set(prev);
                                              if(checked) newSet.add(person.id);
                                              else newSet.delete(person.id);
                                              return newSet;
                                          })
                                      }}
                                  />
                                </TableCell>
                                <TableCell className="w-[30px] px-1 sm:px-2 text-center font-mono text-[9px] sm:text-[10px] text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="w-[120px] font-medium text-[11px] sm:text-sm px-2 sm:px-4 whitespace-nowrap overflow-hidden">
                                    <div className="truncate">{person.fullName}</div>
                                </TableCell>
                                <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4 whitespace-nowrap">{person.phone}</TableCell>
                                <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4 whitespace-nowrap">{(person.contactSource || []).join(', ') || 'N/A'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                No unassigned contacts found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </main>
    </>
  );
}
