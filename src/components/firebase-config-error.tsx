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
            
            {isRulesError && (
              <div className="space-y-4">
                 <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required: Check Your Firestore Rules</AlertTitle>
                  <AlertDescription>
                    The error message suggests your database is rejecting requests. This is common if you have recently removed authentication or are starting a new project.
                  </AlertDescription>
                </Alert>
                <ol className="list-decimal space-y-4 pl-5 text-sm">
                  <li>
                    Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a> and open your project.
                  </li>
                  <li>
                    In the left-hand menu, go to <strong>Build &gt; Firestore Database</strong>.
                  </li>
                   <li>
                    Select the <strong>Rules</strong> tab at the top of the page.
                  </li>
                  <li>
                    Replace the existing rules with the following code to allow public access during development. <strong>Note:</strong> This is for development only and should be secured before production.
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
                  </li>
                  <li>
                    Click the <strong>Publish</strong> button. It may take a minute for the changes to apply.
                  </li>
                </ol>
              </div>
            )}

            {isConfigError && (
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Required: Check Your Firebase Credentials</AlertTitle>
                        <AlertDescription>
                            The most common cause of this error is a missing or invalid setup in your <strong>.env.local</strong> file.
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
                </div>
            )}
            
            <Separator />

            {error?.message && (
                <div className="space-y-2">
                    <h3 className="font-semibold">Full Error Message:</h3>
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
