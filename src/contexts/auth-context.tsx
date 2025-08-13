
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, configError as firebaseConfigError } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink as firebaseSignInWithEmailLink } from 'firebase/auth';
import { getUserByEmail } from '@/services/user-service';
import type { AppUser } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithEmailLink: (email: string, url: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const actionCodeSettings = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002/login',
  handleCodeInApp: true,
};

// These paths do not require authentication
const UNPROTECTED_PATHS = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(firebaseConfigError);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const dbUser = await getUserByEmail(firebaseUser.email!);
          if (dbUser) {
            setAppUser(dbUser);
          } else {
            // This case occurs if a user is in Firebase Auth but not in Firestore 'users' collection.
            // We sign them out to prevent access.
            console.warn(`User ${firebaseUser.email} found in Auth but not in Firestore. Signing out.`);
            await firebaseSignOut(auth);
            setUser(null);
            setAppUser(null);
          }
        } catch (e) {
            console.error("Failed to fetch app user from Firestore", e);
            setError(e instanceof Error ? e : new Error("Failed to fetch user data."));
            await firebaseSignOut(auth);
            setUser(null);
            setAppUser(null);
        }
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  React.useEffect(() => {
    if (!loading && !user && !UNPROTECTED_PATHS.includes(pathname)) {
        router.push('/login');
    }
  }, [loading, user, pathname, router]);

  const sendSignInLink = async (email: string) => {
    window.localStorage.setItem('emailForSignIn', email);
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  };
  
  const signInWithEmailLink = async (email: string, url: string) => {
      if (!isSignInWithEmailLink(auth, url)) {
          throw new Error("Invalid sign-in link.");
      }
      await firebaseSignInWithEmailLink(auth, email, url);
  }

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setAppUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    appUser,
    loading,
    error,
    sendSignInLink,
    signInWithEmailLink,
    signOut,
    setAppUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
