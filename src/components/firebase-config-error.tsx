
"use client";

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
            <h3 className="font-semibold">Step 2: Enable Authentication Provider</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          You need to enable the Email/Password provider for your app. In the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>, go to <strong>Build &gt; Authentication &gt; Sign-in method</strong>. Find and enable the <strong>Email/Password</strong> provider.
        </p>
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
            Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Credentials page</a>, find the API key named "Browser key (auto created by Firebase)", edit it, and under "Website restrictions," add EACH of the following domains. **Do not include `https://`**.
        </p>
        <pre className="bg-muted p-3 rounded-md mt-2 text-xs overflow-x-auto font-mono text-foreground leading-relaxed">
{`studio--spiritual-gemv1-39818720-c204b.us-central1.hosted.app
6000-firebase-studio-1751343902620.cluster-6dx7corvpngoivimwvvljgokdw.cloudworkstations.dev
6000-firebase-spiritual-gemv1-39818720-c204b-1755005513029.cluster-6dx7corvpngoivimwvvljgokdw.cloudworkstations.dev
localhost:9002
spiritual-gemv1-39818720-c204b.firebaseapp.com`}
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
          A silent authentication failure, where you are stuck on the login page or unable to create users, often means that critical APIs are disabled in your Google Cloud project.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">How to Enable the APIs</h3>
        </div>
        <p className="text-sm text-muted-foreground">
            The error message indicates your project needs the <strong>Identity Toolkit API</strong> enabled to perform authentication tasks.
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
                Go to the <a href={GCloudApiLibraryUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud API Library</a> for your project ({projectId || 'unknown project'}).
            </li>
            <li>
                Search for and enable each of the following APIs, one by one:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Identity Toolkit API</strong> <span className="text-destructive font-semibold">(Essential for login & user management)</span></li>
                    <li>Firebase Management API</li>
                    <li>Cloud Firestore API</li>
                </ul>
            </li>
            <li>
                After enabling the APIs, wait 1-2 minutes for the changes to propagate, then refresh this page and try again.
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
  const isApiError = !isPermissionError && !isInitializationError && !isReferrerError && (
    errorMessage.includes('api-key-not-valid') || 
    errorMessage.includes('auth/network-request-failed') || 
    errorMessage.includes('authentication failure') ||
    errorMessage === ''
  );

  return (
    <>
      <div className="flex w-full items-center justify-center bg-background p-4 min-h-screen overflow-y-auto">
        <Card className="max-w-3xl my-8">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Connection Error</CardTitle>
            <CardDescription>
              Your app is having trouble communicating with Firebase. Follow the steps below for project <strong>{projectId || 'unknown'}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isReferrerError && <ReferrerError />}
            {isPermissionError && !isReferrerError && <PermissionsError />}
            {isInitializationError && <InitializationError />}
            {isApiError && <ApiError projectId={projectId} />}

            {/* Fallback for other errors */}
            {!isReferrerError && !isPermissionError && !isInitializationError && !isApiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>An Unexpected Error Occurred</AlertTitle>
                <AlertDescription>
                 <p>An unknown error is preventing the app from working correctly. Please review the error message below.</p>
                 {errorMessage && <pre className="mt-2 text-xs bg-muted p-2 rounded whitespace-pre-wrap">{errorMessage}</pre>}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">After making the required changes in the Google Cloud or Firebase console, please refresh this page.</p>
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
