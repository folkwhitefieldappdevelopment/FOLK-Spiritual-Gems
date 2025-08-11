
'use client';

import * as React from 'react';
import { Loader2, ShieldAlert, Search, PlusCircle, MoreHorizontal, Edit, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit } from '@/services/audit-service';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
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
import { getUsers, updateUser, getFolkGuides } from '@/services/user-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { userRoles, type UserRole, type AppUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreateUserDialog, type UserFormValues } from '@/components/create-user-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { deleteUserAction } from './actions';

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export default function UserManagementPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AppUser | undefined>(undefined);
  const [userToDelete, setUserToDelete] = React.useState<AppUser | null>(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  
  const fetchUsersAndGuides = React.useCallback(async () => {
    if (!appUser) return;

    setIsLoadingUsers(true);
    setFetchError(null);
    try {
      const [usersData, guidesData] = await Promise.all([
        getUsers(),
        getFolkGuides(),
      ]);

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
      setFolkGuides(guidesData);

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
  }, [appUser, toast]);

  React.useEffect(() => {
    if (appUser) {
        fetchUsersAndGuides();
    }
  }, [appUser, fetchUsersAndGuides]);


  const handleOpenCreateDialog = () => {
    setEditingUser(undefined);
    setIsFormDialogOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    setEditingUser(user);
    setIsFormDialogOpen(true);
  };
  
  const handleDeleteConfirmed = async () => {
    if (!userToDelete || !appUser) return;
    try {
        const actorInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
        const result = await deleteUserAction(userToDelete.id, actorInfo);
        
        if (result.success) {
            toast({
                title: 'User Record Deleted',
                description: result.message
            });
            fetchUsersAndGuides();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
            variant: 'destructive',
            title: 'Error Deleting User',
            description: errorMessage,
        });
    } finally {
        setUserToDelete(null);
    }
  };

  const handleSaveUser = async (data: UserFormValues, userId?: string) => {
    if (!appUser) return;
    try {
      const actorInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      const userData: { [key: string]: any } = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role as UserRole[],
      };

      if (data.role.includes('Folk Guide') && data.fgCode) {
        userData.fgCode = data.fgCode;
      }

      if (data.role.includes('Folk Enabler') && data.guideId) {
        const guide = folkGuides.find(g => g.id === data.guideId);
        if (guide) {
          userData.reportsTo = {
            guideId: guide.id,
            guideName: guide.name,
            guideFgCode: guide.fgCode || '',
          };
        }
      } else {
        userData.reportsTo = null; // Remove this field if user is not an enabler
      }
      
      if (userId) { // This is an update
        await updateUser(userId, userData, actorInfo);
        toast({
          title: 'User Updated',
          description: `${data.name}'s details have been updated.`,
        });
        fetchUsersAndGuides();
      }
      
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Error Saving User',
        description: errorMessage,
      });
      throw error; 
    }
  };
  
  const filteredUsers = React.useMemo(() => {
    return users
      .filter(user => {
        const searchInput = searchTerm.toLowerCase();
        return searchInput
          ? user.name.toLowerCase().includes(searchInput) ||
            user.email.toLowerCase().includes(searchInput)
          : true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [users, searchTerm]);

  const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader
            title="User Management"
            description="Create and manage application users."
          >
            <Button size="sm" onClick={handleOpenCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </PageHeader>
          <main className="flex-1 p-4 sm:p-6 sm:pt-0">
            <div className="mx-auto max-w-4xl space-y-6">
                 <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Manual Action Required</AlertTitle>
                    <AlertDescription>
                       To grant access, you must create a user record here and then **manually send the generated sign-in link** to their email. To fully revoke access, delete the user record from this page.
                    </AlertDescription>
                 </Alert>
              <Card>
                <CardHeader>
                    <CardTitle>Existing Users</CardTitle>
                    <CardDescription>
                      View and search all users in the system. Found {filteredUsers.length} users.
                    </CardDescription>
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={fetchUsersAndGuides} disabled={isLoadingUsers}>
                              <RefreshCw className={isLoadingUsers ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                          </Button>
                        </div>
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
                                        <TableHead className="min-w-[200px]">Name</TableHead>
                                        <TableHead className="hidden sm:table-cell">Phone</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="hidden md:table-cell">Created</TableHead>
                                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map(user => {
                                      const isSelf = user.id === appUser?.id;

                                      return (
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
                                        <TableCell className="text-muted-foreground hidden sm:table-cell">{user.phone}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-col gap-1">
                                            <div className="flex flex-wrap gap-1">
                                                {(user.role || []).map(r => <Badge key={r} variant="secondary">{r}</Badge>)}
                                            </div>
                                            {user.fgCode && <Badge variant="outline">FG Code: {user.fgCode}</Badge>}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                                          {safeDate(user.createdAt) ? format(safeDate(user.createdAt)!, 'PP') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleEditUser(user)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {!isSelf && (
                                                  <DropdownMenuItem onSelect={() => setUserToDelete(user)} className="text-destructive focus:text-destructive">
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Delete
                                                  </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                      );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center p-8 text-muted-foreground">No users found for the current filters.</div>
                        )}
                    </div>
                </CardContent>
              </Card>

            </div>
          </main>
      </div>
    
    <CreateUserDialog
      isOpen={isFormDialogOpen}
      setIsOpen={setIsFormDialogOpen}
      onSave={handleSaveUser}
      user={editingUser}
      folkGuides={folkGuides}
      onUserCreated={fetchUsersAndGuides}
    />
    {userToDelete && (
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will delete the user {userToDelete.name} from this application's database and authentication system. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteConfirmed}
                className="bg-destructive hover:bg-destructive/90"
            >
                Delete User
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </div>
  );
}
