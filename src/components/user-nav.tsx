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
import { LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { ChangePasswordDialog } from './change-password-dialog';
import { cn } from '@/lib/utils';

export function UserNav({ isSheet = false }: { isSheet?: boolean }) {
  const { appUser, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !appUser) {
    return <Skeleton className={cn(isSheet ? "h-20 w-full" : "h-8 w-8", "rounded-full")} />;
  }
  
  const nameParts = appUser.name.split(' ');
  const initials = `${nameParts[0]?.[0] || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] || '' : ''}`;

  const trigger = isSheet ? (
    <Button 
      variant="ghost" 
      className="w-full h-auto p-4 flex items-center justify-between hover:bg-muted/50 rounded-2xl group transition-all"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
          <AvatarImage src={appUser.photoUrl} alt={appUser.name} />
          <AvatarFallback className="bg-muted text-primary font-black">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className="text-sm font-black text-foreground uppercase tracking-tight leading-none mb-1">{appUser.name}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
            {appUser.role.join(' • ')}
          </p>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
    </Button>
  ) : (
    <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src={appUser.photoUrl} alt={appUser.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="sr-only">Toggle user menu</span>
    </Button>
  );

  return (
    <>
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-2xl">
              <DropdownMenuLabel className="p-4">
                <p className="text-sm font-black text-foreground uppercase truncate">{appUser.name}</p>
                <p className="text-[10px] leading-none text-muted-foreground truncate mt-1">
                    {appUser.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsChangePasswordOpen(true)} className="p-3 cursor-pointer rounded-lg font-bold">
                  <KeyRound className="mr-3 h-4 w-4" />
                  <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="p-3 cursor-pointer rounded-lg font-black text-destructive focus:text-destructive">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Log out</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog isOpen={isChangePasswordOpen} setIsOpen={setIsChangePasswordOpen} />
    </>
  );
}
