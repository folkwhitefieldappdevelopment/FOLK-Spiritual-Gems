
'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function FirebaseConfigError({ error }: { error?: any }) {
  const [domainToAdd, setDomainToAdd] = React.useState('localhost');

  React.useEffect(() => {
    if (error?.message && error.message.includes('requests-from-referer')) {
      const match = error.message.match(/referer-(.*?)-are-blocked/);
      if (match && match[1]) {
        setDomainToAdd(match[1]);
      }
    } else if (typeof window !== 'undefined') {
        // Fallback for generic auth/unauthorized-domain errors
        setDomainToAdd(window.location.hostname);
    }
  }, [error]);

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Authentication Setup Incomplete</CardTitle>
            <CardDescription>
              The application is running into Firebase authentication errors. This usually indicates that the Firebase project is not fully configured to handle sign-in requests from this app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required: Check Your Authentication Setup</AlertTitle>
              <AlertDescription>
                Please carefully check the following common issues in your Firebase project's authentication settings.
              </AlertDescription>
            </Alert>
            
            <p>Please follow these steps in your Firebase project:</p>
            <ol className="list-decimal space-y-4 pl-5 text-sm">
              <li>
                <strong>1. Enable the Identity Platform API.</strong>
                <p className="mt-1">The error <code className="bg-muted px-1 py-0.5 rounded-sm font-code">requests-to-this-api...-are-blocked</code> means a required Google Cloud service is disabled. Go to the <a href="https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Identity Platform API page</a> in the Google Cloud Console, ensure your project is selected, and click **Enable**. This is the most likely cause of the current error.</p>
              </li>
              <li>
                <strong>2. Authorize your domain for authentication.</strong>
                <p className="mt-1">The error <code className="bg-muted px-1 py-0.5 rounded-sm font-code text-destructive">auth/unauthorized-domain</code> can also occur. In the Firebase Console, go to <strong>Authentication</strong> &gt; <strong>Settings</strong> and add the following domain to the list of <strong>Authorized domains</strong>.</p>
                <p className="mt-2 font-semibold">Domain to add:</p>
                <code className="bg-muted px-2 py-1 rounded-md font-code text-destructive block my-2 break-all">{domainToAdd}</code>
              </li>
              <li>
                  <strong>3. (For Android Apps Only) Add SHA-1 Fingerprints.</strong>
                  <p className="mt-1">This step is **not required for this web application**, but it is essential if you have a native Android app using Google Sign-In with this Firebase project.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2">
                      <li>
                          <strong>Debug Key (for local development):</strong> In your Android Studio terminal, run <code className="bg-muted px-1 py-0.5 rounded-sm font-code">./gradlew signingReport</code> and copy the SHA-1 fingerprint from the `debug` variant.
                      </li>
                      <li>
                          <strong>Release Key (for Play Store app):</strong> In the Google Play Console, go to **Setup &gt; App integrity**. Under "App signing key certificate", copy the **SHA-1 certificate fingerprint**.
                      </li>
                  </ul>
                  <p className="mt-2">Add both of these fingerprints in your Firebase Console under **Project Settings &gt; Your Android App &gt; Add fingerprint**.</p>
              </li>
              <li>
                <strong>4. Restrict your API Key.</strong>
                <p className="mt-1">For security, your API key should be restricted. In the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Credentials page</a>, find the API key used in your app and apply two types of restrictions:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Application restriction:</strong> Select "Websites" and add your app's domains (like <code>{domainToAdd}</code> and any deployed URLs).</li>
                    <li><strong>API restrictions:</strong> Select "Restrict key" and enable only the APIs your app needs. For this app, you'll need:
                        <ul className="list-none pl-5 mt-1 font-mono text-xs">
                            <li>Identity Toolkit API</li>
                            <li>Cloud Firestore API</li>
                            <li>Token Service API</li>
                        </ul>
                    </li>
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">Mismatched or missing restrictions can also cause authentication to fail.</p>
              </li>
               <li>
                  <strong>5. Double-check your web app credentials.</strong>
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
