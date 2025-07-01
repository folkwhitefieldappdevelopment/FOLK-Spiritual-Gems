
'use client';

import * as React from 'react';

type AdminContextType = {
  isAdmin: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
};

const AdminContext = React.createContext<AdminContextType | undefined>(undefined);

const ADMIN_PIN = '3690';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedIsAdmin = localStorage.getItem('isAdmin');
      if (storedIsAdmin) {
        setIsAdmin(JSON.parse(storedIsAdmin));
      }
    } catch (error) {
      console.error('Failed to parse isAdmin from localStorage', error);
      setIsAdmin(false);
    }
  }, []);

  const login = (pin: string): boolean => {
    if (pin === ADMIN_PIN) {
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('isAdmin');
    setIsAdmin(false);
  };

  const value = { isAdmin, login, logout };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = React.useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
