export interface Contraction {
  id: string;                    // UUID
  startTime: number;             // Unix timestamp (ms)
  endTime: number | null;        // null if active
  duration: number | null;       // Seconds
  intensity?: number;            // 1-10 scale
  notes?: string;                // Optional
  createdAt: number;             // Timestamp
  updatedAt: number;             // Timestamp
  syncStatus: 'synced' | 'pending' | 'conflict';
  syncedAt?: number;             // Last sync time
  sheetRowId?: number;           // Google Sheet row
  archived?: boolean;            // Soft-deleted/archived
}

export interface ContractionStats {
  total: number;
  averageDuration: number;       // Seconds
  averageInterval: number;       // Seconds
  lastContraction?: Contraction;
  recentContractions: Contraction[];
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
}
