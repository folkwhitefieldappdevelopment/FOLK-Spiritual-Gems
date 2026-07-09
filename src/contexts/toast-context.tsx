'use client';

import { createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';

export const ToastContext = createContext<{ toast: ReturnType<typeof useToast>['toast'] } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>;
}

export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useAppToast must be used within a ToastProvider');
  }
  return context;
};
