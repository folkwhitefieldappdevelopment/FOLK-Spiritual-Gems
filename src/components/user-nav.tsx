
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';

export function UserNav() {
  const { appUser } = useAuth();

  if (!appUser) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }
  
  const nameParts = appUser.name.split(' ');
  const initials = `${nameParts[0]?.[0] || ''}${nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] || '' : ''}`;

  return (
    <div className="relative h-8 w-8 rounded-full">
      <Avatar className="h-8 w-8">
          <AvatarImage src={appUser.photoUrl} alt={appUser.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
