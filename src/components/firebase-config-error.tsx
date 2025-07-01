'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function FirebaseConfigError() {
  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Connection to Database Failed</CardTitle>
            <CardDescription>
              If you've already added your Firebase credentials, this error usually means there's a configuration issue in the Firebase Console itself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please check the following in your Firebase project:</p>
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>Is Firestore Database enabled?</strong>
                <p className="mt-1">In the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, go to the "Build" menu and click **Firestore Database**. If you see a "Create database" button, you must click it and follow the setup prompts.</p>
              </li>
              <li>
                <strong>Are your Security Rules correct?</strong>
                <p className="mt-1">This is the most common problem. When asked, select **Start in test mode**. This will allow the app to connect for 30 days.</p>
                <p className="mt-1">If your database already exists, go to the **Rules** tab in the Firestore section. For development, your rules should allow read and write access. You can use these insecure rules for now:</p>
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
                  <strong>Are your credentials correct?</strong>
                  <p className="mt-1">Just in case, double-check that the `firebaseConfig` object in <code className="bg-muted px-1 py-0.5 rounded-sm font-code">src/lib/firebase.ts</code> perfectly matches the one from your Firebase Project Settings.</p>
              </li>
            </ol>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After checking these steps in the Firebase Console, please refresh this page.</p>
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
