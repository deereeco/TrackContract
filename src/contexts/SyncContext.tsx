import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncState } from '../types/sync';

interface SyncContextType {
  syncState: SyncState;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase is always the backend — always real-time
  const syncState: SyncState = {
    status: 'idle',
    lastSyncTime: Date.now(),
    pendingOperations: 0,
    backend: 'firebase',
    realtimeEnabled: true,
  };

  return (
    <SyncContext.Provider value={{ syncState, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
