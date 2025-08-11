
'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    
  // By creating a static user object and providing a no-op setter,
  // we ensure the context value is stable and does not trigger re-renders.
  const mockUser: AppUser = React.useMemo(() => ({
    id: 'anonymous-user',
    name: 'Default User',
    email: 'user@example.com',
    phone: '0000000000',
    role: ['Admin'],
    createdAt: new Date(),
  }), []);

  const value: AuthContextType = React.useMemo(() => ({
    user: null, // Firebase user is null as we are not using Firebase Auth
    appUser: mockUser,
    loading: false, // No longer loading as the user is static
    error: null,
    // Provide no-op functions for signIn and signOut
    signIn: async () => { console.warn("Sign-in functionality has been removed."); },
    signOut: async () => { console.warn("Sign-out functionality has been removed."); },
    // Provide a no-op setter to satisfy the type
    setAppUser: () => {},
  }), [mockUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
