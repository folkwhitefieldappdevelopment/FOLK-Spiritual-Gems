
'use client';

import * as React from 'react';
import { type User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';

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

  React.useEffect(() => {
    // onAuthStateChanged is the primary listener for auth state.
    // It will fire when the user is signed in (after popup or redirect) or signed out.
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
    });

    // We also check for a redirect result on initial load.
    // This is to handle any errors that might have occurred during the redirect.
    // The user object itself will be set by the onAuthStateChanged listener.
    getRedirectResult(auth)
      .catch(error => {
        // This catches errors from the redirect flow, e.g., if the user
        // cancels the sign-in on the Google page.
        console.error("Error from sign-in redirect", error);
      });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Use redirect for mobile devices as popups can be problematic.
      // Use popup for desktop for a smoother UX without a full page reload.
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      // This will primarily catch errors from signInWithPopup.
      if (error.code === 'auth/popup-closed-by-user') {
        // This is a common user action and not a critical error.
        // We can log it quietly or ignore it to prevent console noise.
        console.log('Sign-in popup was closed by the user.');
      } else {
        console.error('Error initiating sign in with Google', error);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // After sign out, redirect to login page.
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

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
