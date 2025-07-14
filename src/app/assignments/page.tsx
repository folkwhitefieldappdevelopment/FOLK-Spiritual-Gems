
'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Person, AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { getPeople, assignEnablerToPeople } from '@/services/people-service';
import { getUsers, getEnablersForGuide } from '@/services/user-service';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { AuthGuard } from '@/components/auth-guard';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';


const ROWS_PER_PAGE = 50;

function AssignmentsPageComponent() {
  const { appUser } = useAuth();
  const { toast } = useToast();

  const [people, setPeople] = React.useState<Person[]>([]);
  const [assignableUsers, setAssignableUsers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);

  const [unassignedSearchTerm, setUnassignedSearchTerm] = React.useState('');
  const [selectedContactIds, setSelectedContactIds] = React.useState<Set<string>>(new Set());
  const [selectedEnablerId, setSelectedEnablerId] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState(1);

  const fetchData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const peopleData = await getPeople(appUser);
      let usersToAssign: AppUser[] = [];

      if (appUser.role.includes('Admin')) {
        const allUsers = await getUsers();
        // Admins can assign to any enabler or guide
        usersToAssign = allUsers.filter(u => u.role.includes('Folk Enabler') || u.role.includes('Folk Guide'));
      } else if (appUser.role.includes('Folk Guide')) {
        const enablersUnderGuide = await getEnablersForGuide(appUser.id);
        // Guides can assign to enablers under them, or to themselves
        usersToAssign = [appUser, ...enablersUnderGuide];
      }
      
      setPeople(peopleData);
      setAssignableUsers(usersToAssign.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (error) {
      console.error("Failed to load assignment data:", error);
      if (error instanceof Error) setFetchError(error);
    } finally {
      setIsLoading(false);
    }
  }, [appUser]);

  React.useEffect(() => {
    if(appUser) fetchData();
  }, [appUser, fetchData]);

  const { enablerStats, unassignedContacts } = React.useMemo(() => {
    const stats = new Map<string, number>();
    assignableUsers.forEach(e => stats.set(e.name, 0));
    
    const unassigned: Person[] = [];

    people.forEach(p => {
      if (p.enablerInTouchWith && stats.has(p.enablerInTouchWith)) {
        stats.set(p.enablerInTouchWith, stats.get(p.enablerInTouchWith)! + 1);
      } else {
        unassigned.push(p);
      }
    });

    const filteredUnassigned = unassigned.filter(p => 
        p.fullName.toLowerCase().includes(unassignedSearchTerm.toLowerCase()) ||
        p.phone.includes(unassignedSearchTerm)
    );

    return { enablerStats: stats, unassignedContacts: filteredUnassigned };
  }, [people, assignableUsers, unassignedSearchTerm]);
  
  const totalPages = Math.ceil(unassignedContacts.length / ROWS_PER_PAGE);
  
  const paginatedContacts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return unassignedContacts.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [unassignedContacts, currentPage]);

  const handleAssign = async () => {
    if (selectedContactIds.size === 0 || !selectedEnablerId) {
      toast({ variant: 'destructive', title: 'Selection required', description: 'Please select contacts and an enabler.' });
      return;
    }
    const enabler = assignableUsers.find(e => e.id === selectedEnablerId);
    if (!enabler) {
      toast({ variant: 'destructive', title: 'Invalid Enabler' });
      return;
    }

    try {
      await assignEnablerToPeople(Array.from(selectedContactIds), enabler, appUser);
      toast({ title: 'Contacts Assigned', description: `${selectedContactIds.size} contacts were assigned to ${enabler.name}.` });
      
      // Manually update local state for instant feedback
      setPeople(prev => prev.map(p => {
        if (selectedContactIds.has(p.id)) {
          return { ...p, enablerInTouchWith: enabler.name };
        }
        return p;
      }));

      setSelectedContactIds(new Set());
      setSelectedEnablerId('');

    } catch (error) {
      toast({ variant: 'destructive', title: 'Assignment Failed', description: 'Could not assign contacts.' });
    }
  };
  
  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = new Set(paginatedContacts.map(p => p.id));
      setSelectedContactIds(prev => new Set([...Array.from(prev), ...Array.from(pageIds)]));
    } else {
      const pageIds = new Set(paginatedContacts.map(p => p.id));
      setSelectedContactIds(prev => {
          const newSet = new Set(prev);
          pageIds.forEach(id => newSet.delete(id));
          return newSet;
      });
    }
  }

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedContactIds(new Set());
  }, [unassignedSearchTerm]);

  if (isLoading) {
    return <div className="flex min-h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (fetchError) {
    return <FirebaseConfigError error={fetchError} />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <PageHeader
          title="Contact Assignments"
          description="Assign unassigned contacts to available enablers."
        />
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6 sm:pt-0 h-[calc(100vh-80px)]">
          {/* Left Panel: Enablers */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle>Enablers</CardTitle>
              <CardDescription>List of all available enablers and their current contact count.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4 -mr-4">
                <div className="space-y-4">
                  {assignableUsers.map(enabler => (
                    <div key={enabler.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={enabler.photoUrl} alt={enabler.name} />
                            <AvatarFallback>{enabler.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{enabler.name}</p>
                          <div className="text-xs text-muted-foreground">
                              {enabler.role.includes('Folk Guide') && <Badge variant="secondary" className="mr-1">Guide</Badge>}
                              {enabler.role.includes('Folk Enabler') && <Badge variant="outline" className="mr-1">Enabler</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{enablerStats.get(enabler.name) || 0}</p>
                        <p className="text-xs text-muted-foreground">contacts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel: Unassigned Contacts */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle>Unassigned Contacts ({unassignedContacts.length})</CardTitle>
              <CardDescription>Select contacts from this list to assign them to an enabler.</CardDescription>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search unassigned contacts..."
                    className="pl-10"
                    value={unassignedSearchTerm}
                    onChange={e => setUnassignedSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
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
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <div className="border rounded-lg flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                              onCheckedChange={handleSelectAllOnPage}
                              checked={paginatedContacts.length > 0 && paginatedContacts.every(p => selectedContactIds.has(p.id))}
                              aria-label="Select all on this page"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedContacts.length > 0 ? (
                        paginatedContacts.map(person => (
                          <TableRow key={person.id}
                              data-state={selectedContactIds.has(person.id) ? "selected" : undefined}
                          >
                            <TableCell>
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
                            <TableCell className="font-medium">{person.fullName}</TableCell>
                            <TableCell>{person.phone}</TableCell>
                            <TableCell>{person.contactSource || 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No unassigned contacts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="p-2 text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
    return (
        <AuthGuard adminOrGuideOnly>
            <AssignmentsPageComponent />
        </AuthGuard>
    )
}
