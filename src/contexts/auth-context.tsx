
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
import { doc, onSnapshot, setDoc, getDocs, collection, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/lib/types';


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

        if (user && user.uid) { // <-- Check for user.uid
          // User is signed in with Firebase Auth, now listen for real-time updates to their app data.
          const userDocRef = doc(db, 'users', user.uid); // <-- Use user.uid
          
          unsubscribeUserListener = onSnapshot(userDocRef, 
            async (docSnap) => {
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
                // User's record was not found in Firestore. Create it automatically.
                console.warn(`User with UID ${user.uid} authenticated but has no Firestore profile. Creating one now.`);
                
                try {
                  const usersCollection = collection(db, 'users');
                  const usersSnapshot = await getDocs(query(usersCollection));
                  const isFirstUser = usersSnapshot.empty;
                  
                  const newUserProfile: Omit<AppUser, 'id'> = {
                    name: user.displayName || 'New User',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    role: isFirstUser ? ['Admin'] : ['Folk Enabler'], // First user becomes admin
                    createdAt: serverTimestamp(),
                  };

                  await setDoc(userDocRef, newUserProfile);
                  
                  // The onSnapshot listener will fire again with the new data, so we don't need to setLoading(false) here.
                  toast({
                    title: 'Profile Created',
                    description: 'Your user profile was missing and has been automatically created.',
                  });

                } catch (createError) {
                  console.error("Failed to auto-create user profile:", createError);
                  toast({
                    variant: 'destructive',
                    title: 'Critical Error',
                    description: 'Could not create your user profile. Please contact support.',
                  });
                  firebaseSignOut(auth);
                }
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
        // Prompt for email if not found in storage.
        // This can happen if the user opens the link on a different device.
        emailFromStorage = window.prompt('Please provide your email for confirmation');
    }
    if (!emailFromStorage) {
        throw new Error("Email is required to sign in with a link.");
    }
    
    try {
        await signInWithEmailLink(auth, emailFromStorage, window.location.href);
        // On successful sign-in, the auth state observer will handle the rest.
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
