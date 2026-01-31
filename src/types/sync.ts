export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export type SyncBackend = 'firebase' | 'googleSheets' | 'none';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  pendingOperations: number;
  error?: string;
  backend: SyncBackend;
  realtimeEnabled: boolean;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'archive' | 'restore';
  contractionId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface GoogleSheetsConfig {
  scriptUrl: string;
  sheetName: string;
}

export interface ConflictResolution {
  localVersion: any;
  remoteVersion: any;
  resolvedVersion: any;
  strategy: 'local' | 'remote' | 'merged';
}
