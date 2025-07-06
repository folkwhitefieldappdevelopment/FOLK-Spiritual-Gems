
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, configError } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { FirebaseConfigError } from '@/components/firebase-config-error';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Using signInWithRedirect instead of signInWithPopup
      await signInWithRedirect(auth, provider);
      // The user will be redirected to the Google sign-in page.
      // After signing in, they will be redirected back here, and onAuthStateChanged will handle the result.
    } catch (error) {
      console.error("Error initiating sign in with redirect", error);
      // Re-throw the error to be caught by the calling component (LoginPage)
      throw error;
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
  
  if (configError) {
    return <FirebaseConfigError error={configError} />;
  }

  const value = { user, loading, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
