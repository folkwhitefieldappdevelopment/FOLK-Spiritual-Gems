
'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from './ui/separator';

export function FirebaseConfigError({ error }: { error?: any }) {
  const errorMessage = error?.message?.toLowerCase() || '';
  const isRulesError = errorMessage.includes('offline') || errorMessage.includes('permission-denied') || errorMessage.includes('false');
  const isConfigError = !isRulesError;

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Connection Error</CardTitle>
            <CardDescription>
              Your app can't connect to Firebase correctly. Please follow the steps below to resolve the issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required: Check Your Firestore Rules & Credentials</AlertTitle>
                <AlertDescription>
                    The error message "{error?.message}" suggests your database is rejecting requests. This is common if you have recently removed authentication or are starting a new project.
                </AlertDescription>
                </Alert>
                <ol className="list-decimal space-y-4 pl-5 text-sm">
                <li>
                    <strong>Check your Firestore Security Rules.</strong> Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, open your project, and navigate to <strong>Build &gt; Firestore Database &gt; Rules</strong>. For development, replace the rules with the following to allow public access:
                    <pre className="bg-muted p-2 rounded-md mt-2 text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                    </pre>
                     <p className="font-semibold text-destructive mt-1">Note: These rules are for development only. Secure your database before going to production.</p>
                </li>
                <li>
                    <strong>Verify your `.env.local` file.</strong> Ensure it exists in your project root and contains the correct credentials from your Firebase project's settings. Crucially, <strong className="text-destructive">make sure the `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in your file matches the Project ID in the Firebase console</strong> where you just edited the rules.
                    <pre className="bg-muted p-2 rounded-md mt-2 text-xs overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...`}
                    </pre>
                </li>
                </ol>
            </div>
            
            <Separator />

            {error?.message && (
                <div className="space-y-2">
                    <h3 className="font-semibold">Full Error Message for Debugging:</h3>
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">{error.message}</p>
                </div>
            )}
            
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After making the required changes, please refresh this page.</p>
          </CardFooter>
        </Card>
      </div>
      <Button
        onClick={() => window.location.reload()}
        variant="destructive"
        className="fixed bottom-8 right-8 z-50"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh Page
      </Button>
    </>
  );
}
