'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LogOut, User as UserIcon, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ChangePasswordDialog } from './change-password-dialog';

export function UserNav() {
  const { user, appUser, signOut } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  if (!user || !appUser) {
    return null;
  }

  const fallbackInitial = appUser.name ? appUser.name.charAt(0).toUpperCase() : <UserIcon />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? ''} alt={appUser.name ?? 'User'} />
              <AvatarFallback>
                {fallbackInitial}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
             <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                <p className="text-base text-muted-foreground">Name:</p>
                <p className="text-sm font-medium leading-none truncate">{appUser.name}</p>

                <p className="text-base text-muted-foreground">Role:</p>
                <p className="text-xs leading-none font-semibold truncate">{appUser.role?.join(', ')}</p>

                <p className="text-base text-muted-foreground">Email:</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{appUser.email}</p>
             </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
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
