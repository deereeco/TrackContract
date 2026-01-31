import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncState, SyncBackend } from '../types/sync';
import { getSyncBackend } from '../services/storage/localStorage';

interface SyncContextType {
  syncState: SyncState;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backend] = useState<SyncBackend>(getSyncBackend());

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

  // Sync status is always "real-time" for Firebase
  const syncState: SyncState = {
    status: backend === 'firebase' ? 'idle' : 'offline',
    lastSyncTime: Date.now(),
    pendingOperations: 0,
    backend,
    realtimeEnabled: backend === 'firebase',
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
