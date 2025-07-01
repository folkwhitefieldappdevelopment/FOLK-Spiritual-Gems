'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gem } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic, redirects to the main contacts page
    router.push('/contacts');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-primary">
          <Gem className="h-6 w-6" />
          <span>Spiritual Gems</span>
      </div>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2">
            <Button className="w-full" type="submit">
              Sign in
            </Button>
            <p className="text-xs text-muted-foreground">
              Spiritual Gems is always free.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
