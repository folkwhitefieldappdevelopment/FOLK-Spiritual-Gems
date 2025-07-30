
'use client';

import * as React from 'react';
import { 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut, 
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword,
    sendPasswordResetEmail,
    type User,
    type AuthError
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getUserByEmail } from '@/services/user-service';
import type { AppUser } from '@/lib/types';
import isEqual from 'lodash.isequal';


type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateCurrentAppUser: (updates: Partial<AppUser>) => void;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);

  const updateCurrentAppUser = React.useCallback((updates: Partial<AppUser>) => {
    setAppUser(prev => {
        if (!prev) return null;

        // Check if there's actually a change to avoid infinite loops
        const hasChanged = Object.keys(updates).some(key => 
            !isEqual(prev[key as keyof AppUser], updates[key as keyof AppUser])
        );

        if (hasChanged) {
            return { ...prev, ...updates };
        }
        
        return prev;
    });
  }, []);

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
              
              // Add photoUrl to appUser for easy access
              if (user.photoURL) {
                appUserData.photoUrl = user.photoURL;
              }

              // User is in our DB, allow access.
              setUser(user);
              setAppUser(appUserData);
            } else {
              // User not in our DB, deny access by signing them out.
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'Your user record was not found in the application database. Please contact an administrator.',
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
    setLoading(true);
    setError(null);
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
      // Do not set a global error for a failed login attempt. The toast is sufficient.
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
  };

  const sendPasswordReset = async (email: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const actionCodeSettings = {
      url: `${appUrl}/login`,
      handleCodeInApp: true,
    };
    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (err) {
      console.error("Error sending password reset email", err);
      // We don't distinguish between user-not-found and other errors to avoid email enumeration attacks
      throw new Error('Failed to send password reset email. Please try again.');
    }
  };

  const value = { user, appUser, loading, error, signIn, signOut, changePassword, sendPasswordReset, updateCurrentAppUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
