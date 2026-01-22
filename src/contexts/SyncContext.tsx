import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncState } from '../types/sync';
import { getLastSyncTime, setLastSyncTime } from '../services/storage/localStorage';
import { syncEngine } from '../services/sync/syncEngine';

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

    if (!syncEngine.isConfigured()) {
      // No sync configured, skip silently
      return;
    }

    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    try {
      // Run incremental sync to push pending changes
      await syncEngine.incrementalSync();

      const now = Date.now();
      setLastSyncTime(now);

      const pendingCount = await syncEngine.getPendingCount();

      setSyncState({
        status: 'idle',
        lastSyncTime: now,
        pendingOperations: pendingCount
      });
    } catch (error) {
      console.error('Sync error:', error);
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, [isOnline]);

  // Initial sync on mount if configured
  useEffect(() => {
    if (isOnline && syncEngine.isConfigured()) {
      triggerSync();
    }
  }, []); // Run once on mount

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
