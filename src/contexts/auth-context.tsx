
'use client';

import * as React from 'react';
import type { AppUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Mock user since authentication is removed
const mockAppUser: AppUser = {
  id: 'anonymous-user',
  name: 'Default User',
  email: 'user@example.com',
  phone: '1234567890',
  role: ['Admin', 'Folk Guide', 'Folk Enabler'], // Grant all roles
  createdAt: new Date().toISOString(),
};


type AuthContextType = {
  user: any; // Keep 'any' for compatibility with components that might still expect it
  appUser: AppUser | null;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  error: Error | null;
  // All auth functions are now no-ops
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
  const [appUser, setAppUser] = React.useState<AppUser | null>(mockAppUser);

  const noOp = async () => {
    toast({
        title: 'Authentication Disabled',
        description: 'Login and user management have been removed from this application.',
    });
    return Promise.resolve();
  };

  const value = {
    user: mockAppUser, // Provide mock user
    appUser: appUser,
    setAppUser,
    loading: false, // Never loading
    error: null,
    signIn: noOp,
    signOut: noOp,
    changePassword: noOp,
    sendPasswordReset: noOp,
    isSignInLink: () => false,
    completeSignInWithEmailLink: noOp,
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
