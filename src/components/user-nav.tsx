
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut, KeyRound } from 'lucide-react';
import { ChangePasswordDialog } from './change-password-dialog';

export function UserNav() {
  const { appUser, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !appUser) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }
  
  const nameParts = appUser.name.split(' ');
  const initials = `${nameParts[0]?.[0] || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] || '' : ''}`;

  return (
    <>
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={appUser.photoUrl} alt={appUser.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p className="text-sm font-medium leading-none">{appUser.name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate max-w-[150px]">
                    {appUser.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsChangePasswordOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog isOpen={isChangePasswordOpen} setIsOpen={setIsChangePasswordOpen} />
    </>
  );
}
