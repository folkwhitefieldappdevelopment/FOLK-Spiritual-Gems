
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
  const [loading, setLoading] = React.useState(true); // Start as true
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    // onAuthStateChanged returns an unsubscriber. It's the single source of truth for the user's auth state.
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

    // Call getRedirectResult to handle the result of a sign-in redirect.
    // This should be done on component mount to check if the user is returning from a redirect.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // A user has successfully signed in via redirect.
          // onAuthStateChanged will handle the user state update automatically.
          // This block is useful for logging or triggering one-time actions on redirect login.
          console.log("Handled redirect result for user:", result.user.displayName);
        }
      })
      .catch((err) => {
        // This catches errors from the redirect itself, like a config issue or disabled account.
        console.error("Firebase Redirect Result Error:", err);
        setError(err);
        setLoading(false); // Make sure to stop loading on error.
      });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The redirect will cause the page to unload. The result is handled by
      // getRedirectResult when the app reloads.
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
