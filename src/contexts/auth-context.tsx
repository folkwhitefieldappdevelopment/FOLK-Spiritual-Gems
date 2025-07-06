
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
  const [loading, setLoading] = React.useState(true); // Start as true
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    // This effect runs once on mount to handle two things:
    // 1. Check if the user is returning from an email link sign-in.
    // 2. Set up the primary auth state listener.

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // This can happen if the user opens the link on a different browser.
        // We can't complete the sign-in without the email.
        // The user will see the login page and can re-enter their email.
        console.warn("Sign-in link clicked, but no email found in storage.");
      } else {
        // The email was found, so we can complete the sign-in.
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            // `onAuthStateChanged` will fire and handle the user state update.
            window.localStorage.removeItem('emailForSignIn');
            // Clear the URL parameters to prevent re-triggering.
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch((err) => {
            console.error("Error signing in with email link:", err);
            setError(err);
          });
      }
    }

    // `onAuthStateChanged` is the single source of truth for the user's auth state.
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setUser(user);
        setLoading(false); // We have a definitive state now, so stop loading.
      },
      (err) => {
        console.error("Firebase Auth State Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.href, // Redirect back to the current page (login page)
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save the email locally to be used when the user clicks the link
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
      throw err; // Re-throw to be caught in the component
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting the user to null.
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
