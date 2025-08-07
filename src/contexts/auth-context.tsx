
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
    isSignInWithEmailLink,
    signInWithEmailLink,
    type User,
    type AuthError
} from 'firebase/auth';
import { auth, configError as initialConfigError } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';


type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  isSignInLink: () => boolean;
  completeSignInWithEmailLink: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(initialConfigError);
  
  React.useEffect(() => {
    let unsubscribeUserListener: (() => void) | null = null;

    const authStateListener = onAuthStateChanged(auth, 
      (user) => {
        // Clean up previous user's snapshot listener if there was one
        if (unsubscribeUserListener) {
            unsubscribeUserListener();
            unsubscribeUserListener = null;
        }

        if (user && user.email) {
          // User is signed in with Firebase Auth, now listen for real-time updates to their app data.
          const userDocRef = doc(db, 'users', user.uid);
          
          unsubscribeUserListener = onSnapshot(userDocRef, 
            (docSnap) => {
              if (docSnap.exists()) {
                const appUserData = { id: docSnap.id, ...docSnap.data() } as AppUser;

                // This ensures backward compatibility for users created when 'role' was a string.
                if (typeof appUserData.role === 'string') {
                    // @ts-ignore - Allow temporary mismatch for migration
                    appUserData.role = [appUserData.role];
                } else if (!Array.isArray(appUserData.role)) {
                    appUserData.role = [];
                }
                
                if (user.photoURL) {
                    appUserData.photoUrl = user.photoURL;
                }
                
                if (appUserData.createdAt && typeof appUserData.createdAt !== 'string' && appUserData.createdAt.toDate) {
                    appUserData.createdAt = appUserData.createdAt.toDate().toISOString();
                }

                setUser(user);
                setAppUser(appUserData);
              } else {
                // User's record was deleted from Firestore after they logged in.
                toast({
                    variant: 'destructive',
                    title: 'Access Revoked',
                    description: 'Your user record was not found. Please contact an administrator.',
                });
                firebaseSignOut(auth); // This will trigger the onAuthStateChanged again to clean up state
              }
              setLoading(false);
            },
            (snapshotError) => {
                console.error("Firestore onSnapshot error:", snapshotError);
                toast({
                    variant: 'destructive',
                    title: 'Database Error',
                    description: 'Could not sync user data. Please try again later.',
                });
                firebaseSignOut(auth);
                setLoading(false);
            }
          );
        } else {
          // No user is signed in.
          setUser(null);
          setAppUser(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase Auth State Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup both listeners on unmount
    return () => {
        authStateListener();
        if (unsubscribeUserListener) {
            unsubscribeUserListener();
        }
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const authError = err as AuthError;
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: authError.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'An error occurred during sign-in.'
      });
      console.error("Error signing in", err);
      setLoading(false);
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
      throw new Error("User not authenticated.");
    }
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    await reauthenticateWithCredential(user, credential);
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
      throw new Error('Failed to send password reset email. Please try again.');
    }
  };
  
  const isSignInLink = () => {
    return isSignInWithEmailLink(auth, window.location.href);
  };

  const completeSignInWithEmailLink = async () => {
    let emailFromStorage = window.localStorage.getItem('emailForSignIn');
    if (!emailFromStorage) {
        emailFromStorage = window.prompt('Please provide your email for confirmation');
    }
    if (!emailFromStorage) {
        throw new Error("Email is required to sign in with a link.");
    }
    
    try {
        await signInWithEmailLink(auth, emailFromStorage, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
    } catch (err) {
        console.error("Sign in with email link error:", err);
        let description = 'The sign-in link is invalid or has expired.';
        if (err instanceof AuthError && err.code === 'auth/invalid-email') {
            description = 'The email you provided does not match the one in the sign-in link.';
        }
        throw new Error(description);
    }
  };

  const value = { user, appUser, setAppUser, loading, error, signIn, signOut, changePassword, sendPasswordReset, isSignInLink, completeSignInWithEmailLink };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
