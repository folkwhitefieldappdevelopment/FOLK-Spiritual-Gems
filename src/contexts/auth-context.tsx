
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, configError as firebaseConfigError } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getUserByEmail, createUser } from '@/services/user-service';
import type { AppUser } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

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
          let dbUser = await getUserByEmail(firebaseUser.email!);
          
          if (!dbUser) {
            console.warn("User exists in Auth but not in Firestore. This may indicate an issue if this was not a new sign-up.");
            const newUser: Omit<AppUser, 'id' | 'createdAt'> = {
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email!,
              phone: firebaseUser.phoneNumber || '',
              role: ['Folk Enabler'], // Default role
              photoUrl: firebaseUser.photoURL || '',
            };
            dbUser = await createUser(newUser);
          }

          // Ensure timestamps are serializable before setting state
          if (dbUser.createdAt && typeof dbUser.createdAt !== 'string') {
              const date = (dbUser.createdAt as any).toDate ? (dbUser.createdAt as any).toDate() : new Date(dbUser.createdAt);
              dbUser.createdAt = date.toISOString();
          }

          setAppUser(dbUser);
        } catch (e) {
            console.error("Failed to fetch or create app user in Firestore", e);
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
  
  const signIn = async (email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
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
    signIn,
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
