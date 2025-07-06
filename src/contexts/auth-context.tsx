
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
        if (user && user.email) {
          // User is signed in with Firebase Auth, now verify against our database
          try {
            const appUser = await getUserByEmail(user.email);
            if (appUser) {
              // User is in our DB, allow access.
              setUser(user);
            } else {
              // User not in our DB, deny access.
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'This account is not authorized. Please contact an administrator.',
                duration: 5000,
              });
              await firebaseSignOut(auth);
              setUser(null);
            }
          } catch (e) {
            console.error("Error verifying user against database", e);
            toast({
              variant: 'destructive',
              title: 'Verification Error',
              description: 'Could not verify access rights. Please try again.',
            });
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          // No user is signed in, or user has no email.
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
    setLoading(true); // Set loading to true on sign-in attempt
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener will handle setting the user state after verification
    } catch (err) {
      const authError = err as AuthError;
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: authError.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'An error occurred during sign-in.'
      });
      console.error("Error signing in", err);
      if (err instanceof Error) {
        setError(err);
      }
      setLoading(false); // Set loading to false on error
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // The onAuthStateChanged listener will set user to null
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
