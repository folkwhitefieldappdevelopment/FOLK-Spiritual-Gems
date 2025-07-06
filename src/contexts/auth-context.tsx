
'use client';

import * as React from 'react';
import { 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    signOut as firebaseSignOut, 
    getRedirectResult,
    type User 
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    if (initialConfigError) {
      setLoading(false);
      return;
    }

    // First, check for the result of a sign-in redirect.
    // This is a one-time operation that captures the user credential.
    getRedirectResult(auth)
      .catch((err) => {
        // This catches errors that occur during the redirect itself,
        // such as permission errors or if the user cancels.
        console.error("Firebase Redirect Result Error:", err);
        setError(err);
      });

    // onAuthStateChanged is the persistent listener that keeps the app's
    // state in sync with Firebase's understanding of the user's session.
    // It will fire after getRedirectResult completes successfully.
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setUser(user);
        setLoading(false); // We are no longer loading once we have a definitive user state.
      },
      (err) => {
        console.error("Firebase Auth State Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true); // Show loading indicator when sign-in starts
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The page will redirect away, so no need to set loading to false here.
    } catch (err) {
      console.error("Error initiating sign in with redirect", err);
      if (err instanceof Error) {
        setError(err);
      }
      setLoading(false); // Only set loading false if the redirect itself fails to start.
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set the user to null and update the UI.
    } catch (err) {
      console.error("Error signing out", err);
      if (err instanceof Error) {
        setError(err);
      }
    }
  };

  const value = { user, loading, error, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
