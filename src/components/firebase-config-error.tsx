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
              <AlertTitle>Action Required: Check Your Firebase Setup</AlertTitle>
              <AlertDescription>
                This error happens when the app cannot read from your database. Please carefully check the following common issues in your Firebase project.
              </AlertDescription>
            </Alert>
            
            <p>Please follow these steps in your Firebase project:</p>
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>1. Ensure Firestore Database is created.</strong>
                <p className="mt-1">In the Firebase Console, go to the <strong>Firestore Database</strong> section. If you see a "Create database" button, you must click it. When prompted, select a location and choose to <strong>start in test mode</strong>. This automatically sets the correct security rules for 30 days and is the most common fix.</p>
              </li>
              <li>
                <strong>2. Verify your Security Rules.</strong>
                <p className="mt-1">If you already have a database, check its security rules. In the Firebase Console, go to the Firestore Database section and click the <strong>Rules</strong> tab. For development, your rules must allow read and write access. Copy and paste the following rules and click "Publish".</p>
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
                  <strong>3. Double-check your credentials.</strong>
                  <p className="mt-1">Just in case, make sure the `firebaseConfig` object in <code className="bg-muted px-1 py-0.5 rounded-sm font-code">src/lib/firebase.ts</code> perfectly matches the one from your Firebase Project Settings.</p>
              </li>
            </ol>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After fixing the configuration in the Firebase Console, please refresh this page.</p>
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
