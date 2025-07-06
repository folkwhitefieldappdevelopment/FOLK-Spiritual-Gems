
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
    // This effect runs once on app load.
    // It handles the result of a sign-in redirect and then sets up a
    // listener for any future authentication changes.
    
    // First, check for the redirect result. This is crucial for the redirect flow.
    getRedirectResult(auth)
      .catch((err) => {
        // This catches errors from the redirect itself, like if the user's
        // account is disabled or if there's a configuration issue.
        console.error("Firebase Redirect Result Error:", err);
        setError(err);
      });

    // Then, set up the onAuthStateChanged listener. This is the single
    // source of truth for the user's authentication state. It will fire
    // after getRedirectResult completes, and for any subsequent sign-in/out.
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

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // We only initiate the redirect here. The result is handled by
      // getRedirectResult when the app reloads.
      await signInWithRedirect(auth, provider);
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
