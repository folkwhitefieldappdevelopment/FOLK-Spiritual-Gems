'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, db, configError as firebaseConfigError } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppUser } from '../lib/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
};

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const UNPROTECTED_PATHS = ['/login/'];
const BOOTSTRAP_ADMINS = [
    { email: 'sarthakg187@gmail.com', name: 'Sarthak Gupta', role: ['Admin', 'Folk Enabler'] }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(firebaseConfigError);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = React.useMemo(() => {
    return UNPROTECTED_PATHS.includes(pathname) || 
           pathname.startsWith('/register/') || 
           pathname.startsWith('/check-in/') || 
           pathname.startsWith('/co-enabler/');
  }, [pathname]);

  React.useEffect(() => {
    if (!auth || !db) {
        setLoading(false);
        return;
    }

    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        if (userUnsubscribe) userUnsubscribe();

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        userUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
            if (!docSnap.exists()) {
                const bootstrap = BOOTSTRAP_ADMINS.find(a => a.email === firebaseUser.email?.toLowerCase());
                if (bootstrap) {
                    const newUser: any = {
                        name: bootstrap.name,
                        email: bootstrap.email,
                        phone: firebaseUser.phoneNumber || '',
                        role: bootstrap.role,
                        photoUrl: firebaseUser.photoURL || '',
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userDocRef, newUser);
                } else {
                    setAppUser(null);
                    setIsUnauthorized(true);
                    setLoading(false);
                }
                return; // wait for resulting snapshot
            }

            const data = docSnap.data();
            
            // Resilient role processing (ensure array)
            let roles = data.role || [];
            if (typeof roles === 'string') roles = [roles];
            if (!Array.isArray(roles)) roles = [];

            const processedUser = {
                id: docSnap.id,
                ...data,
                role: roles,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            } as AppUser;
            
            setAppUser(processedUser);
            setIsUnauthorized(false);
            setLoading(false);
        }, (err) => {
            console.error("User sync failure", err);
            setLoading(false);
        });
      } else {
        if (userUnsubscribe) userUnsubscribe();
        userUnsubscribe = null;
        setUser(null);
        setAppUser(null);
        setIsUnauthorized(false);
        setLoading(false);
      }
    });

    return () => {
        authUnsubscribe();
        if (userUnsubscribe) userUnsubscribe();
    };
  }, []);
  
  React.useEffect(() => {
    if (loading) return;
    if (user && !isUnauthorized && (pathname === '/login/' || pathname === '/login')) {
      router.push('/dashboard/');
    } else if (!user && !isPublicPath) {
      router.push('/login/');
    }
  }, [loading, user, isUnauthorized, pathname, router, isPublicPath]);
  
  const signIn = async (email: string, pass: string) => {
      if (!auth) throw new Error("Auth not initialized");
      await signInWithEmailAndPassword(auth, email, pass);
  }

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
    setIsUnauthorized(false);
    router.push('/login/');
  };

  const value = { user, appUser, loading, error, signIn, signOut, setAppUser };
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (isUnauthorized && !isPublicPath) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive mb-6" />
              <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-8">Your account is not yet authorized.</p>
              <Button onClick={signOut} variant="outline" className="font-black uppercase text-[10px] h-11 px-8 rounded-xl">Sign Out</Button>
          </div>
      )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
