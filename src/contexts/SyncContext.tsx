import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncState, SyncBackend } from '../types/sync';
import { getLastSyncTime, setLastSyncTime, getSyncBackend } from '../services/storage/localStorage';
import { syncEngine } from '../services/sync/syncEngine';

interface SyncContextType {
  syncState: SyncState;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backend] = useState<SyncBackend>(getSyncBackend());
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncTime: getLastSyncTime(),
    pendingOperations: 0,
    backend: getSyncBackend(),
    realtimeEnabled: getSyncBackend() === 'firebase',
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
        pendingOperations: pendingCount,
        backend: getSyncBackend(),
        realtimeEnabled: getSyncBackend() === 'firebase',
      });

      // Dispatch event so other components can refresh their data
      window.dispatchEvent(new CustomEvent('sync-completed'));
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

  // Background sync every 60 seconds when online (only for Google Sheets)
  useEffect(() => {
    // Firebase uses real-time sync, no polling needed
    if (backend === 'firebase') {
      setSyncState(prev => ({
        ...prev,
        status: 'idle',
        realtimeEnabled: true,
      }));
      return;
    }

    // Google Sheets: poll every 60 seconds
    if (backend === 'googleSheets' && isOnline) {
      const interval = setInterval(() => {
        triggerSync();
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }
  }, [backend, isOnline, triggerSync]);

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
