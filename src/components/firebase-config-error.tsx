
'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from './ui/separator';

export function FirebaseConfigError({ error }: { error?: any }) {
  const [domainToAdd, setDomainToAdd] = React.useState('localhost');

  React.useEffect(() => {
    if (error?.message && error.message.includes('requests-from-referer')) {
      const match = error.message.match(/referer-(.*?)-are-blocked/);
      if (match && match[1]) {
        setDomainToAdd(match[1]);
      }
    } else if (typeof window !== 'undefined') {
        setDomainToAdd(window.location.hostname);
    }
  }, [error]);

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Authentication Setup Required</CardTitle>
            <CardDescription>
              Your app can't connect to Firebase Authentication. This usually means a few settings in your Firebase project need to be configured. Please follow these steps carefully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Top 3 Things to Check First</AlertTitle>
              <AlertDescription>
                For web applications using Google Sign-In, these are the most common setup issues.
              </AlertDescription>
            </Alert>
            
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>Enable the Google Sign-In Provider.</strong>
                <p className="mt-1">This is the most common reason for sign-in failure. In the Firebase Console, navigate to <strong>Authentication &gt; Sign-in method</strong>. Click on <strong>Google</strong> from the list of providers and <strong>enable</strong> it. Make sure to select a project support email when prompted.</p>
              </li>
              <li>
                <strong>Authorize Your App's Domain.</strong>
                <p className="mt-1">In the Firebase Console, go to <strong>Authentication &gt; Settings</strong> and find the <strong>Authorized domains</strong> tab. Click "Add domain" and add the domain your app is currently running on.</p>
                <p className="mt-2 font-semibold">Domain to add:</p>
                <code className="bg-muted px-2 py-1 rounded-md font-code text-destructive block my-2 break-all">{domainToAdd}</code>
              </li>
              <li>
                <strong>Enable the Identity Platform API.</strong>
                <p className="mt-1">This is a required Google Cloud service that might be disabled. Go to the <a href="https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Identity Platform API page</a>, ensure your project is selected, and click **Enable**. This fixes errors like <code className="bg-muted px-1 py-0.5 rounded-sm font-code">requests-to-this-api...-are-blocked</code>.</p>
              </li>
            </ol>

            <Separator />

            <div className="space-y-4 text-sm">
                <h3 className="font-semibold">Additional Checks</h3>
                <ul className="list-disc space-y-3 pl-5">
                    <li>
                        <strong>Correct Credentials:</strong> Double-check that the `firebaseConfig` object in your app's code (likely in <code className="bg-muted px-1 py-0.5 rounded-sm font-code">src/lib/firebase.ts</code>) perfectly matches the configuration provided in your Firebase Project Settings under "Your apps".
                    </li>
                    <li>
                       <strong>API Key Restrictions:</strong> For security, your API key should be restricted. In the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Credentials page</a>, ensure your key has "Websites" restrictions that include your app's domain, and that its API restrictions include "Identity Toolkit API" and "Cloud Firestore API".
                    </li>
                    <li className="text-xs text-muted-foreground">
                        <strong>Note on Android Apps:</strong> If you are also building a native Android app with this Firebase project, you must add its **SHA-1 fingerprints** in your Firebase Project Settings. This step is **not required** for this web application.
                    </li>
                </ul>
            </div>
            
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
