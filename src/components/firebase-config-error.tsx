'use client';

import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function FirebaseConfigError() {
  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Connection to Database Failed</CardTitle>
            <CardDescription>
              The error message <code className="bg-muted px-1 py-0.5 rounded-sm font-code text-destructive">Error source: Firestore Rules</code> indicates the problem is in your Firebase project configuration, not the application code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required: Check Your Firestore Security Rules</AlertTitle>
              <AlertDescription>
                This is the most likely cause of the error. In the Firebase Console, go to the Firestore Database section and click the **Rules** tab. For development, your rules must allow read and write access.
              </AlertDescription>
            </Alert>
            
            <p>Please follow these steps in your Firebase project:</p>
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>Update your Security Rules.</strong>
                <p className="mt-1">Copy and paste the following rules into the **Rules** tab in the Firestore section of the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>. This will allow the app to connect for development.</p>
                <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-muted p-2 font-code text-xs text-foreground">
                    {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // WARNING: Insecure rules, for development only.
      allow read, write: if true;
    }
  }
}`}
                </pre>
              </li>
              <li>
                <strong>Ensure Firestore Database is enabled.</strong>
                <p className="mt-1">In the Firebase Console, go to **Firestore Database**. If you see a "Create database" button, you must click it. When prompted, select a location and choose to **start in test mode**. This automatically sets the correct security rules for 30 days.</p>
              </li>
               <li>
                  <strong>Double-check your credentials.</strong>
                  <p className="mt-1">Just in case, make sure the `firebaseConfig` object in <code className="bg-muted px-1 py-0.5 rounded-sm font-code">src/lib/firebase.ts</code> perfectly matches the one from your Firebase Project Settings.</p>
              </li>
            </ol>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After fixing the rules in the Firebase Console, please refresh this page.</p>
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
