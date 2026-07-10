'use client';

import * as React from 'react';
import type { BackgroundJob } from '@/lib/types';

type BackgroundTaskContextType = {
  jobs: BackgroundJob[];
  startJob: (job: Omit<BackgroundJob, 'id' | 'startedAt' | 'current' | 'errors' | 'status'>) => string;
  updateJob: (id: string, patch: Partial<BackgroundJob>) => void;
  dismissJob: (id: string) => void;
};

const BackgroundTaskContext = React.createContext<BackgroundTaskContextType | undefined>(undefined);

export function BackgroundTaskProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<BackgroundJob[]>([]);

  const startJob = React.useCallback((jobData: Omit<BackgroundJob, 'id' | 'startedAt' | 'current' | 'errors' | 'status'>) => {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newJob: BackgroundJob = {
      ...jobData,
      id,
      current: 0,
      errors: [],
      status: 'running',
      startedAt: Date.now(),
    };
    setJobs(prev => [newJob, ...prev]);
    return id;
  }, []);

  const updateJob = React.useCallback((id: string, patch: Partial<BackgroundJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...patch } : job
    ));
  }, []);

  const dismissJob = React.useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
  }, []);

  return (
    <BackgroundTaskContext.Provider value={{ jobs, startJob, updateJob, dismissJob }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}

export function useBackgroundTasks() {
  const context = React.useContext(BackgroundTaskContext);
  if (context === undefined) {
    throw new Error('useBackgroundTasks must be used within a BackgroundTaskProvider');
  }
  return context;
}
