'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import { GoogleLoginButton } from '@/components/google-login-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';

export default function GoogleLoginDemoPage() {
  const [loggedInUser, setLoggedInUser] = React.useState<User | null>(null);

  const handleLogin = (user: User) => {
    setLoggedInUser(user);
  };
  
  const handleLogout = async () => {
    await auth.signOut();
    setLoggedInUser(null);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Google Sign-In Demo</CardTitle>
          <CardDescription>
            A demonstration of the reusable Google Login Button.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loggedInUser ? (
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={loggedInUser.photoURL || ''} alt={loggedInUser.displayName || ''} />
                <AvatarFallback>
                  {loggedInUser.displayName?.charAt(0) || loggedInUser.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-semibold">{loggedInUser.displayName}</p>
                <p className="text-sm text-muted-foreground">{loggedInUser.email}</p>
              </div>
              <Button onClick={handleLogout} variant="outline">Sign Out</Button>
            </div>
          ) : (
            <GoogleLoginButton onLogin={handleLogin} className="w-full" />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
