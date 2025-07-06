
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

    // This function ensures we wait for the redirect result before setting up the persistent listener.
    const processAuth = async () => {
      try {
        // Explicitly check for a redirect result first. This resolves to null if the page
        // was loaded without a redirect operation. It's crucial for catching redirect errors.
        await getRedirectResult(auth);
      } catch (err) {
        console.error("Firebase Redirect Result Error:", err);
        if (err instanceof Error) {
            setError(err);
        }
      }

      // After any potential redirect has been processed, set up the onAuthStateChanged listener.
      // This will give us the definitive, final authentication state.
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          setUser(user);
          setLoading(false); // Only stop loading after we have a user or know there isn't one.
        },
        (err) => {
          console.error("Firebase Auth State Error:", err);
          setError(err);
          setLoading(false);
        }
      );

      return unsubscribe;
    };

    const unsubscribePromise = processAuth();

    // Standard React cleanup function for useEffect
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The page will redirect away. No need to set loading to false.
    } catch (err) {
      console.error("Error initiating sign in with redirect", err);
      if (err instanceof Error) {
        setError(err);
      }
      setLoading(false);
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
