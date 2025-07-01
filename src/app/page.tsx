'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000); // 3-second delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center animate-pulse">
        <Gem className="mx-auto h-24 w-24 text-primary" />
        <h1 className="mt-4 text-5xl font-bold text-primary tracking-wider">Spiritual Gems</h1>
      </div>
    </div>
  );
}
