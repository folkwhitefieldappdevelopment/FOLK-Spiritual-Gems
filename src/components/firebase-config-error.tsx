'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from './ui/separator';

export function FirebaseConfigError({ error }: { error?: any }) {
  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Connection Error</CardTitle>
            <CardDescription>
              Your app can't connect to Firebase. This usually means the configuration in your <strong>.env.local</strong> file is missing or incorrect. Please follow these steps to resolve the issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Check your Firebase Configuration</AlertTitle>
              <AlertDescription>
                The most common cause of this error is an invalid setup in your environment variables.
              </AlertDescription>
            </Alert>
            
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>Locate your credentials:</strong> In the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, go to <strong>Project settings</strong> (click the gear icon), scroll down to "Your apps", and select your web app.
              </li>
              <li>
                <strong>Copy the `firebaseConfig` object:</strong> Under "SDK setup and configuration", find the `firebaseConfig` variable. It contains your project's unique keys.
              </li>
              <li>
                <strong>Create a `.env.local` file:</strong> If it doesn't exist, create a new file named `.env.local` in the root of your project.
              </li>
              <li>
                <strong>Paste your credentials:</strong> Copy the keys from the `firebaseConfig` object into your `.env.local` file. The file should look like this, but with your actual values:
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
            
            <Separator />

            {error && (
                <div className="space-y-2">
                    <h3 className="font-semibold">Error Details:</h3>
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">{error.message}</p>
                </div>
            )}
            
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After adding your credentials to `.env.local`, please refresh this page.</p>
          </CardFooter>
        </Card>
      </div>
      <Button
        onClick={() => window.location.reload()}
        variant="destructive"
        className="fixed bottom-8 right-8 z-50"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </>
  );
}
