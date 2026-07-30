'use client';

import * as React from 'react';
import { Loader2, ShieldAlert, Search, PlusCircle, MoreHorizontal, Edit, Trash2, RefreshCw, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit } from '@/services/audit-service';
import { db } from '@/lib/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

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
import { getUsers, updateUser, getFolkGuides, deleteUserOnServer } from '@/services/user-service';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function UserManagementPage() {
  const { toast } = useAppToast();
  const { appUser } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
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
    setIsProcessing(true);
    try {
        await deleteUserOnServer(userToDelete.id);
        toast({ title: 'User Record Deleted', description: 'Authentication and database entries removed.' });
        fetchUsersAndGuides();
    } catch (error: any) {
        console.error("Delete failed:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'System error.' });
    } finally {
        setIsProcessing(false);
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
      
      // The service now awaits the write and throws if error occurs
      await updateUser(userId, userData, { id: appUser.id, name: appUser.name, role: appUser.role });
      
      toast({ title: 'User Updated' });
      fetchUsersAndGuides();
      setIsFormDialogOpen(false);
    } catch (error) {
      // Toast logic is handled by the calling component catch block or service
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
          <PageHeader title="Identity & Access" description="Provision mission staff and manage system permissions.">
            <Button size="sm" onClick={handleOpenCreateDialog} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl">
               <PlusCircle className="mr-2 h-4 w-4" /> Create User
            </Button>
          </PageHeader>
          <main className="flex-1 p-4 sm:p-6 sm:pt-0">
           <TooltipProvider>
            <div className="mx-auto max-w-5xl space-y-6">
              <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-popover">
                <CardHeader className="p-8 pb-4 bg-card border-b border-border">
                    <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        Active Staff Directory
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized contributors across the preaching network.</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Quick search name or official email..." className="h-14 pl-12 rounded-2xl bg-muted border-none text-foreground font-bold shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-border bg-muted/50" onClick={fetchUsersAndGuides} disabled={isLoadingUsers}>
                            <RefreshCw className={cn("h-5 w-5", isLoadingUsers && "animate-spin")} />
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-border overflow-hidden bg-card">
                        {isLoadingUsers ? (
                            <div className="text-center p-20 opacity-40">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Querying Registry...</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-border">
                                        <TableHead className="font-black text-[10px] uppercase pl-6 h-12">Staff Member</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase h-12">Permissions</TableHead>
                                        <TableHead className="text-right pr-6 h-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map(user => (
                                      <TableRow key={user.id} className="border-border hover:bg-muted/30 h-20 transition-all">
                                        <TableCell className="pl-6">
                                          <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
                                                <AvatarFallback className="bg-muted text-foreground font-black text-xs">{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="font-black text-sm text-foreground uppercase truncate">{user.name}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">{user.email}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1.5">
                                            {(user.role || []).map(r => (
                                                <Badge key={r} variant="outline" className="font-black text-[9px] uppercase tracking-tight h-6 px-2.5 bg-primary/5 text-primary border-primary/20">
                                                    {r}
                                                </Badge>
                                            ))}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover border-border rounded-xl w-48 p-1">
                                                <DropdownMenuItem onSelect={() => handleEditUser(user)} className="p-3 font-bold rounded-lg cursor-pointer">
                                                    <Edit className="mr-3 h-4 w-4" /> Edit Permissions
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setUserToDelete(user)} className="p-3 font-black text-destructive focus:text-destructive focus:bg-red-500/10 rounded-lg cursor-pointer">
                                                    <Trash2 className="mr-3 h-4 w-4" /> Revoke Access
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest opacity-40 italic">
                                                No users matching criteria
                                            </TableCell>
                                        </TableRow>
                                    )}
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
        <AlertDialogContent className="bg-popover border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden">
            <div className="p-10 space-y-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-red-500/10 p-5 rounded-[2rem] w-fit border border-red-500/20">
                        <AlertCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center">Terminate User Access?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground font-bold text-center">
                                This will permanently delete the account for <span className="text-foreground">"{userToDelete.name}"</span> from both the database and the Firebase Auth registry. They will immediately lose all access to the CRM.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-2xl border border-border flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                    <p className="text-[10px] font-bold text-red-700/80 leading-tight uppercase">This action cannot be undone. All personal settings for this user will be cleared.</p>
                </div>
            </div>
            <AlertDialogFooter className="p-8 border-t border-border bg-card flex flex-row sm:justify-end gap-3">
                <AlertDialogCancel className="rounded-xl font-bold h-12 flex-1" onClick={() => setUserToDelete(null)}>Keep User</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirmed} disabled={isProcessing} className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] flex-1">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Terminate Account"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  );
}
