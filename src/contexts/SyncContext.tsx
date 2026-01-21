import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncState } from '../types/sync';
import { getLastSyncTime, setLastSyncTime } from '../services/storage/localStorage';

interface SyncContextType {
  syncState: SyncState;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncTime: getLastSyncTime(),
    pendingOperations: 0
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
      return;
    }

    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    try {
      // Sync logic will be implemented in the sync engine
      // For now, just update the state
      const now = Date.now();
      setLastSyncTime(now);
      setSyncState({
        status: 'idle',
        lastSyncTime: now,
        pendingOperations: 0
      });
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, [isOnline]);

  // Background sync every 60 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      triggerSync();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isOnline, triggerSync]);

  return (
    <SyncContext.Provider value={{ syncState, triggerSync, isOnline }}>
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
