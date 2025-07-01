
'use client';

import * as React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [status, setStatus] = React.useState('Initializing connection test...');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setStatus('Attempting to connect to Firebase...');
    setError('');
    try {
      // This is a very simple read operation. It tries to get a single document.
      // The document doesn't even need to exist for the test to pass.
      // A successful "get" (even for a non-existent doc) proves the connection is working.
      const settingsDocRef = doc(db, 'settings', 'options');
      await getDoc(settingsDocRef);
      
      setStatus('Success! Connection to Firestore is working correctly.');
      setError('');
    } catch (e: any) {
      console.error("Firebase connection test failed:", e);
      setStatus('Failed to connect to Firestore.');
      setError(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    runTest();
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col bg-background">
        <PageHeader
          title="Firebase Connection Test"
          description="Attempting to fetch a single document to diagnose the connection issue."
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Connection Status</h2>
              <Button onClick={runTest} disabled={isLoading}>
                {isLoading ? 'Testing...' : 'Run Test Again'}
              </Button>
            </div>
            <p className={`mt-2 text-lg font-bold ${error ? 'text-destructive' : 'text-green-600'}`}>
              {status}
            </p>
            {error && (
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Error Details:</h3>
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-code text-sm text-destructive">
                  {error}
                </pre>
                <p className="text-sm text-muted-foreground">
                    This error usually indicates a problem with your Firebase project setup (like Security Rules) or a network issue (like a firewall or ad-blocker) preventing the connection.
                </p>
              </div>
            )}
            {!error && status.startsWith('Success') && (
                <p className="mt-4 text-muted-foreground">
                    Great! The connection works. You can now ask me to restore the original settings page.
                </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
