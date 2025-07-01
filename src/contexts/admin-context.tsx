
'use client';

import * as React from 'react';

type AdminContextType = {
  isAdmin: boolean;
  setAdmin: (status: boolean) => void;
};

const AdminContext = React.createContext<AdminContextType | undefined>(undefined);

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
      localStorage.removeItem('isAdmin');
      setIsAdmin(false);
    }
  }, []);

  const setAdmin = (status: boolean) => {
    if (status) {
      localStorage.setItem('isAdmin', 'true');
    } else {
      localStorage.removeItem('isAdmin');
    }
    setIsAdmin(status);
  };

  const value = { isAdmin, setAdmin };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = React.useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
