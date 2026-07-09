'use client';

import * as React from 'react';
import { Loader2, ShieldAlert, Search, PlusCircle, MoreHorizontal, Edit, Trash2, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit } from '@/services/audit-service';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';

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
import { useAppToast } from '@/contexts/toast-context';
import { getUsers, updateUser, getFolkGuides } from '@/services/user-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { userRoles, type UserRole, type AppUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export default function UserManagementPage() {
  const { toast } = useAppToast();
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
        getUsers(appUser),
        getFolkGuides(),
      ]);

      setUsers(usersData);
      setFolkGuides(guidesData);

    } catch (error) {
      console.error('Failed to fetch users:', error);
      setFetchError('Failed to load user list.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [appUser]);

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
        await deleteDoc(doc(db, 'users', userToDelete.id));
        await logAudit(`Delete User`, `Deleted user record: ${userToDelete.name}`, { id: appUser.id, name: appUser.name, role: appUser.role });
        toast({ title: 'User Record Deleted' });
        fetchUsersAndGuides();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error Deleting User' });
    } finally {
        setUserToDelete(null);
    }
  };

  const handleUpdateUser = async (data: UserFormValues, userId: string) => {
    if (!appUser) return;
    try {
      const userData: { [key: string]: any } = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role as UserRole[],
      };
      if (data.role.includes('Folk Guide') && data.fgCode) userData.fgCode = data.fgCode;
      if (data.role.includes('Folk Enabler') && data.guideId) {
        const guide = folkGuides.find(g => g.id === data.guideId);
        if (guide) userData.reportsTo = { guideId: guide.id, guideName: guide.name, guideFgCode: guide.fgCode || '' };
      } else userData.reportsTo = null;
      
      await updateUser(userId, userData);
      toast({ title: 'User Updated' });
      fetchUsersAndGuides();
      setIsFormDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error Saving User' });
      throw error; 
    }
  };
  
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
        const searchInput = searchTerm.toLowerCase();
        return searchInput ? user.name.toLowerCase().includes(searchInput) || user.email.toLowerCase().includes(searchInput) : true;
    });
  }, [users, searchTerm]);

  return (
    <>
          <PageHeader title="User Management" description="Create and manage application users.">
            <Button size="sm" onClick={handleOpenCreateDialog}><PlusCircle className="mr-2 h-4 w-4" /> Create User</Button>
          </PageHeader>
          <main className="flex-1 p-4 sm:p-6 sm:pt-0">
           <TooltipProvider>
            <div className="mx-auto max-w-4xl space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle>Existing Users</CardTitle>
                    <CardDescription>View and search all users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by name or email..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchUsersAndGuides} disabled={isLoadingUsers}><RefreshCw className={isLoadingUsers ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button>
                    </div>

                    <div className="border rounded-md">
                        {isLoadingUsers ? (
                            <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map(user => (
                                      <TableRow key={user.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-3">
                                            <Avatar><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">{(user.role || []).map(r => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleEditUser(user)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setUserToDelete(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
              </Card>
            </div>
            </TooltipProvider>
          </main>

    <CreateUserDialog isOpen={isFormDialogOpen} setIsOpen={setIsFormDialogOpen} onUpdate={handleUpdateUser} user={editingUser} folkGuides={folkGuides} onUserCreated={fetchUsersAndGuides} />
    {userToDelete && (
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the user record for {userToDelete.name}.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  );
}
