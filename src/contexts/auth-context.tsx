
'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

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

// A mock user that will be used for the entire application.
const mockAppUser: AppUser = {
    id: 'anonymous-user',
    name: 'Default User',
    email: 'user@example.com',
    phone: '0000000000',
    role: ['Admin'],
    createdAt: new Date(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading the user profile.
    setTimeout(() => {
        setAppUser(mockAppUser);
        setLoading(false);
    }, 250);
  }, []);

  const signIn = async () => {
    console.warn("Sign-in functionality has been removed.");
  };

  const signOut = async () => {
    console.warn("Sign-out functionality has been removed.");
  };

  const value = {
    user: null, // Firebase user is null as we are not using Firebase Auth
    appUser,
    setAppUser,
    loading,
    error: null,
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
