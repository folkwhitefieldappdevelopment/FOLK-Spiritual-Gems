
'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle, ShieldCheck, LogIn, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from './ui/separator';

function InitializationError() {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required: Check Your Firebase Credentials</AlertTitle>
        <AlertDescription>
          The error message suggests your app is not configured correctly. Please carefully verify your setup.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
          <h3 className="font-semibold">Verify Your `.env.local` Credentials</h3>
          <p className="text-sm text-muted-foreground">
              Ensure the `.env.local` file in your project root contains the correct credentials from your Firebase project's settings (under <strong>Project Settings &gt; General &gt; Your apps &gt; Web app</strong>). Crucially, <strong className="text-destructive">make sure the `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in your file matches the Project ID in the Firebase console</strong>.
          </p>
          <pre className="bg-muted p-2 rounded-md mt-2 text-xs overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_ID=... (Optional: for non-default databases)`}
          </pre>
      </div>
    </>
  )
}

function PermissionsError() {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required: Check Your Firebase Settings</AlertTitle>
        <AlertDescription>
          The error message suggests that your request was blocked. This is usually due to Firestore security rules or a disabled authentication provider.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Step 1: Update Your Firestore Rules</h3>
        </div>
        <p className="text-sm text-muted-foreground">
            Since you have an authentication system, your database needs to know that only signed-in users can access data. Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, open your project, and navigate to <strong>Build &gt; Firestore Database &gt; Rules</strong>. Replace the entire content with the following:
        </p>
        <pre className="bg-muted p-2 rounded-md mt-2 text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Allow read/write access only to authenticated users
      allow read, write: if request.auth != null;
    }
  }
}`}
        </pre>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
             <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
                <LogIn className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Step 2: Enable Authentication Providers</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          You need to enable the authentication providers your app uses. In the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, go to <strong>Build &gt; Authentication &gt; Sign-in method</strong>. Find and enable both of the following providers:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
          <li><strong>Email/Password</strong>: Allows users to sign in with a traditional password.</li>
          <li><strong>Email link (passwordless sign-in)</strong>: Allows new users to sign up via a link sent from the User Management page.</li>
        </ul>
      </div>
    </>
  )
}

function ReferrerError() {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required: Update API Key Restrictions</AlertTitle>
        <AlertDescription>
          Your API key has security settings that are blocking your website from using it. You need to authorize all of your app's domains.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Authorize Your Website Domains</h3>
        </div>
        <p className="text-sm text-muted-foreground">
            Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Credentials page</a>, edit your API key, and under "Website restrictions," add EACH of the following domains. **Do not include `https://`**.
        </p>
        <pre className="bg-muted p-3 rounded-md mt-2 text-xs overflow-x-auto font-mono text-foreground leading-relaxed">
{`studio--personal-data-hub-y5fe0.us-central1.hosted.app
6000-firebase-studio-1751343902620.cluster-6dx7corvpngoivimwvvljgokdw.cloudworkstations.dev
localhost:9002
personal-data-hub-y5fe0.firebaseapp.com`}
        </pre>
         <p className="text-xs text-muted-foreground">
          It may take a minute or two for the changes to apply after you save them.
        </p>
      </div>
    </>
  )
}

function ApiError({ projectId }: { projectId?: string }) {
  const GCloudApiLibraryUrl = projectId
    ? `https://console.cloud.google.com/apis/library?project=${projectId}`
    : 'https://console.cloud.google.com/apis/library';

  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Action Required: Enable Google Cloud APIs</AlertTitle>
        <AlertDescription>
          A silent authentication failure, where you are stuck on the login page, often means that critical APIs are disabled in your Google Cloud project. The most common cause is a disabled <strong>Identity Toolkit API</strong>.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">How to Enable the APIs</h3>
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
                Go to the <a href={GCloudApiLibraryUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud API Library</a> for your project.
            </li>
            <li>
                Search for and enable each of the following APIs, one by one. The most critical one is <strong>Identity Toolkit API</strong>.
                <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Identity Toolkit API <span className="text-destructive font-semibold">(Essential for login)</span></li>
                    <li>Firebase Management API</li>
                    <li>Firebase Hosting API</li>
                    <li>Cloud Firestore API</li>
                    <li>Cloud Datastore API</li>
                </ul>
            </li>
            <li>
                After enabling the necessary APIs, it may take a minute or two for the changes to apply. Then, refresh this page.
            </li>
        </ol>
      </div>
    </>
  )
}


export function FirebaseConfigError({ error }: { error?: any }) {
  const errorMessage = error?.message?.toLowerCase() || '';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const isPermissionError = errorMessage.includes('permission-denied') || errorMessage.includes('offline') || errorMessage.includes('operation-not-allowed');
  const isInitializationError = errorMessage.includes('configuration is missing');
  const isReferrerError = errorMessage.includes('api_key_http_referrer_blocked') || errorMessage.includes('auth/requests-from-referer');

  return (
    <>
      <div className="flex w-full items-center justify-center bg-background p-4 min-h-screen">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Connection Error</CardTitle>
            <CardDescription>
              Your app can't connect to Firebase correctly. Please follow the steps below to resolve the issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isReferrerError && <ReferrerError />}
            {isPermissionError && !isReferrerError && <PermissionsError />}
            {isInitializationError && <InitializationError />}
            {!isPermissionError && !isInitializationError && !isReferrerError && (
              <ApiError projectId={projectId} />
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
