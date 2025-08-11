
'use client';

import * as React from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, configError } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(configError);
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
  
  React.useEffect(() => {
    if (user && !appUser) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const roles = docSnap.data().role as UserRole[];
                if (!roles || roles.length === 0) {
                     toast({
                        variant: 'destructive',
                        title: 'Access Revoked',
                        description: 'You do not have a role assigned. Please contact an administrator.',
                    });
                    firebaseSignOut(auth);
                } else {
                    setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
                }
            } else {
                // This case can happen if a user is deleted from Firestore but not from Auth.
                toast({
                    variant: 'destructive',
                    title: 'Access Revoked',
                    description: 'Your user profile could not be found.',
                });
                firebaseSignOut(auth);
            }
        });

        return () => unsubscribe();
    } else if (!user) {
        setAppUser(null);
    }
  }, [user, toast]);

  const signIn = async (email: string, password: string) => {
    if (configError) throw configError;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (configError) throw configError;
    await firebaseSignOut(auth);
    setAppUser(null); // Clear app user on sign out
  };

  const value = {
    user,
    appUser,
    setAppUser,
    loading,
    error,
    signIn,
    signOut,
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
