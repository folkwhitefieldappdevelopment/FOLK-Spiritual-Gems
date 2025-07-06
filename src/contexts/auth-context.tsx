
'use client';

import * as React from 'react';
import { 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut, 
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword,
    type User,
    type AuthError
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getUserByEmail } from '@/services/user-service';
import type { AppUser } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        if (user && user.email) {
          // User is signed in with Firebase Auth, now verify against our database
          try {
            const appUserData = await getUserByEmail(user.email);
            if (appUserData) {
              // This ensures backward compatibility for users created when 'role' was a string.
              if (typeof appUserData.role === 'string') {
                // @ts-ignore - Allow temporary mismatch for migration
                appUserData.role = [appUserData.role];
              } else if (!Array.isArray(appUserData.role)) {
                // If role is missing or not an array, default to an empty array.
                appUserData.role = [];
              }

              // User is in our DB, allow access.
              setUser(user);
              setAppUser(appUserData);
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
              setAppUser(null);
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
            setAppUser(null);
          }
        } else {
          // No user is signed in, or user has no email.
          setUser(null);
          setAppUser(null);
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
      throw new Error("User not authenticated.");
    }
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // Re-authenticate the user
    await reauthenticateWithCredential(user, credential);
    
    // Update the password
    await updatePassword(user, newPassword);
  }

  const value = { user, appUser, loading, error, signIn, signOut, changePassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
