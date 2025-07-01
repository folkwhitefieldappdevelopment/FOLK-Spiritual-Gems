import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function FirebaseConfigError() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-destructive">Firebase Configuration Error</CardTitle>
          <CardDescription>
            The application could not connect to the database. This is usually because the Firebase configuration is missing or incorrect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Please follow these steps to fix the issue:</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a> and create a new project (or use an existing one).</li>
            <li>In your project, go to Project Settings and find your web app's configuration snippet.</li>
            <li>Open the file <code className="bg-muted px-1 py-0.5 rounded-sm font-code">src/lib/firebase.ts</code> in your editor.</li>
            <li>Replace the placeholder values in the <code className="bg-muted px-1 py-0.5 rounded-sm font-code">firebaseConfig</code> object with your project's actual credentials.</li>
          </ol>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Once you've updated the configuration, please refresh the page.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
