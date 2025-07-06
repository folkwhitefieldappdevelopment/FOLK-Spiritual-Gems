
'use client';

import * as React from 'react';
import { 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut, 
    type User,
    type AuthError
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getUserByEmail } from '@/services/user-service';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        if (user) {
          // User is signed in with Firebase Auth, now verify against our 'users' collection
          try {
            const userProfile = await getUserByEmail(user.email!);
            if (userProfile) {
              // User exists in our database, grant access
              setUser(user);
            } else {
              // User is authenticated but not authorized in our system
              await firebaseSignOut(auth);
              setUser(null);
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'Your account is not authorized to access this application. Please contact an administrator.'
              });
            }
          } catch (e) {
            // Handle case where firestore is not available.
            setError(e as Error);
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          // No user is signed in
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firebase Auth State Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const authError = err as AuthError;
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: authError.message || 'Please check your credentials and try again.'
      });
      console.error("Error signing in", err);
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

  const value = { user, loading, error, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
