'use client';

import * as React from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useAppToast } from '@/contexts/toast-context';

export function FirebaseErrorListener() {
  const { toast } = useAppToast();

  React.useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In development, we want to see the full contextual error in the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        // In production, show a friendly toast
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.removeListener('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
