
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

// This is a temporary redirect page.
// In a real application, you might want a landing page here.
export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null; // Return null or a loader while redirecting
}
