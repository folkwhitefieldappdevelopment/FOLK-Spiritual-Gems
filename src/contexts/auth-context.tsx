
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, signOut as firebaseSignOut, type User, getRedirectResult } from 'firebase/auth';
import { auth, configError } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useToast } from '@/hooks/use-toast';

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
  const [error, setError] = React.useState<Error | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (configError) {
      setLoading(false);
      setError(configError);
      return;
    }

    // Check for redirect result to catch any errors after returning from Google sign-in.
    getRedirectResult(auth)
      .then((result) => {
        // If result is not null, onAuthStateChanged will handle the user state update.
        // We don't need to do anything here with a successful result.
      })
      .catch((error) => {
        // Handle Errors here. This is crucial for debugging.
        console.error("Firebase redirect result error:", error);
        setError(error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error initiating sign in with redirect", error);
      if (error instanceof Error) {
        setError(error);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
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
