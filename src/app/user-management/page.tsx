'use client';

import * as React from 'react';
import { Loader2, ShieldAlert, Search, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createUser, getUsers } from '@/services/user-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { userRoles, type UserRole, type AppUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreateUserDialog, type UserFormValues } from '@/components/create-user-dialog';

export default function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  
  const fetchUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    setFetchError(null);
    try {
      const usersData = await getUsers();
      // Sanitize user data to ensure role is always an array for backward compatibility
      const sanitizedUsers = usersData.map(u => {
        const userWithArrayRole = { ...u };
        if (typeof userWithArrayRole.role === 'string') {
          // @ts-ignore
          userWithArrayRole.role = [userWithArrayRole.role];
        } else if (!Array.isArray(userWithArrayRole.role)) {
          userWithArrayRole.role = [];
        }
        return userWithArrayRole;
      });
      setUsers(sanitizedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setFetchError('Failed to load user list.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch the list of existing users.',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreateUser(data: UserFormValues) {
    try {
      await createUser(data as Omit<AppUser, 'id' | 'createdAt'>);
      toast({
        title: 'User Created & Invite Sent',
        description: `${data.name} has been added and a sign-up link has been sent to their email.`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Error Creating User',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      throw error; // Re-throw to prevent dialog from closing on error
    }
  }
  
  const filteredUsers = React.useMemo(() => {
    return users
      .filter(user => {
        const searchInput = searchTerm.toLowerCase();
        const searchMatch = searchInput
          ? user.name.toLowerCase().includes(searchInput) ||
            user.email.toLowerCase().includes(searchInput)
          : true;
        
        const roleMatch = roleFilter ? user.role?.includes(roleFilter as UserRole) : true;

        return searchMatch && roleMatch;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [users, searchTerm, roleFilter]);

  const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return null;
  }

  return (
    <AuthGuard adminOnly={true}>
      <>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col bg-background">
            <PageHeader
              title="User Management"
              description="Create and manage application users."
            >
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </PageHeader>
            <main className="flex-1 p-4 sm:p-6">
              <div className="mx-auto max-w-4xl space-y-6">
                <Card>
                  <CardHeader>
                      <CardTitle>Existing Users</CardTitle>
                      <CardDescription>View and search all users in the system. Found {filteredUsers.length} users.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                          <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                  placeholder="Search by name or email..."
                                  className="pl-10 w-full"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                              />
                          </div>
                          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value === 'all' ? '' : value)}>
                              <SelectTrigger className="w-full sm:w-[200px]">
                                  <SelectValue placeholder="Filter by role" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Roles</SelectItem>
                                  {userRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="border rounded-md">
                          {isLoadingUsers ? (
                              <div className="text-center p-8">
                                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </div>
                          ) : fetchError ? (
                              <div className="text-center p-8 text-destructive">{fetchError}</div>
                          ) : filteredUsers.length > 0 ? (
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead className="w-[250px]">Name</TableHead>
                                          <TableHead>Phone</TableHead>
                                          <TableHead>Roles</TableHead>
                                          <TableHead>Created</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {filteredUsers.map(user => (
                                          <TableRow key={user.id}>
                                              <TableCell>
                                                  <div className="flex items-center gap-3">
                                                      <Avatar>
                                                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                      </Avatar>
                                                      <div>
                                                          <p className="font-medium">{user.name}</p>
                                                          <p className="text-xs text-muted-foreground">{user.email}</p>
                                                      </div>
                                                  </div>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                                              <TableCell>
                                                  <div className="flex flex-wrap gap-1">
                                                      {user.role?.map(r => <Badge key={r} variant="secondary">{r}</Badge>)}
                                                  </div>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground text-xs">
                                                  {safeDate(user.createdAt) ? format(safeDate(user.createdAt)!, 'PP') : 'N/A'}
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          ) : (
                              <div className="text-center p-8 text-muted-foreground">No users found for the current filters.</div>
                          )}
                      </div>
                  </CardContent>
                </Card>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Important Note on User Authentication</AlertTitle>
                  <AlertDescription>
                    This form adds a user record and sends a sign-up link. The link allows them to sign in once. For subsequent logins, they will need to use the same email and a password. If they haven't set a password, they may need to use a 'Forgot Password' flow if one is implemented. To create a user with a password directly, you must manually add them in the{' '}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                    >
                      Firebase Console
                    </a> under the 'Authentication' section.
                  </AlertDescription>
                </Alert>
              </div>
            </main>
          </div>
        </div>
        <CreateUserDialog
          isOpen={isCreateDialogOpen}
          setIsOpen={setIsCreateDialogOpen}
          onSave={handleCreateUser}
        />
      </>
    </AuthGuard>
  );
}
