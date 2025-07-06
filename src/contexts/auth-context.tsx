
'use client';

import * as React from 'react';
import { 
    onAuthStateChanged, 
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut as firebaseSignOut, 
    type User 
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    // This function ensures we process the email link before setting up the final auth state listener.
    // This prevents a race condition where the app might think the user is logged out before the
    // sign-in link has been processed.
    const processAuth = async () => {
      // If the current URL is a sign-in link, process it.
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (email) {
          try {
            // Attempt to sign in the user with the link.
            await signInWithEmailLink(auth, email, window.location.href);
            // Clean up the stored email and the URL parameters.
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState(null, '', window.location.pathname);
          } catch (err) {
            console.error("Error signing in with email link:", err);
            setError(err as Error);
          }
        }
      }

      // AFTER the link processing attempt, set up the listener.
      // onAuthStateChanged will now have the correct user state.
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          setUser(user);
          setLoading(false); // It's now safe to stop loading.
        },
        (err) => {
          console.error("Firebase Auth State Error:", err);
          setError(err);
          setLoading(false);
        }
      );

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    processAuth().then(unsub => {
      unsubscribe = unsub;
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signInWithEmail = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.href, // Redirect back to the current page
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (err) {
      console.error("Error sending sign in link", err);
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: 'Could not send sign-in link. Please check the email address and try again.'
      });
      if (err instanceof Error) {
        setError(err);
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Error signing out", err);
      if (err instanceof Error) {
        setError(err);
      }
    }
  };

  const value = { user, loading, error, signInWithEmail, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
