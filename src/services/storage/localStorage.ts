import { GoogleSheetsConfig, SyncBackend } from '../../types/sync';
import { HistoryEntry } from '../../types/history';

export type ChartDisplayMode = 'duration' | 'interval' | 'both';

const KEYS = {
  THEME: 'contraction-tracker-theme',
  GOOGLE_SHEETS_CONFIG: 'contraction-tracker-google-sheets-config',
  LAST_SYNC_TIME: 'contraction-tracker-last-sync',
  INTENSITY_PROMPT_ENABLED: 'contraction-tracker-intensity-prompt-enabled',
  CHART_DISPLAY_MODE: 'contraction-tracker-chart-display-mode',
  FIREBASE_USER_ID: 'contraction-tracker-firebase-user-id',
  SYNC_BACKEND: 'contraction-tracker-sync-backend',
  HISTORY_ENTRIES: 'contraction-tracker-history-entries',
  HISTORY_POINTER: 'contraction-tracker-history-pointer',
} as const;

// Theme management
export const getTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem(KEYS.THEME);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Default to dark theme or system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const setTheme = (theme: 'light' | 'dark'): void => {
  localStorage.setItem(KEYS.THEME, theme);
};

// Google Sheets configuration
export const getGoogleSheetsConfig = (): GoogleSheetsConfig | null => {
  const stored = localStorage.getItem(KEYS.GOOGLE_SHEETS_CONFIG);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as GoogleSheetsConfig;
  } catch (error) {
    console.error('Failed to parse Google Sheets config:', error);
    return null;
  }
};

export const setGoogleSheetsConfig = (config: GoogleSheetsConfig): void => {
  localStorage.setItem(KEYS.GOOGLE_SHEETS_CONFIG, JSON.stringify(config));
};

export const clearGoogleSheetsConfig = (): void => {
  localStorage.removeItem(KEYS.GOOGLE_SHEETS_CONFIG);
};

export const hasGoogleSheetsConfig = (): boolean => {
  return localStorage.getItem(KEYS.GOOGLE_SHEETS_CONFIG) !== null;
};

// Last sync time
export const getLastSyncTime = (): number | null => {
  const stored = localStorage.getItem(KEYS.LAST_SYNC_TIME);
  return stored ? parseInt(stored, 10) : null;
};

export const setLastSyncTime = (timestamp: number): void => {
  localStorage.setItem(KEYS.LAST_SYNC_TIME, timestamp.toString());
};

// Intensity prompt setting
export const getIntensityPromptEnabled = (): boolean => {
  const stored = localStorage.getItem(KEYS.INTENSITY_PROMPT_ENABLED);
  return stored === 'true'; // Default to false if not set
};

export const setIntensityPromptEnabled = (enabled: boolean): void => {
  localStorage.setItem(KEYS.INTENSITY_PROMPT_ENABLED, enabled.toString());
};

// Chart display mode
export const getChartDisplayMode = (): ChartDisplayMode => {
  const stored = localStorage.getItem(KEYS.CHART_DISPLAY_MODE);
  if (stored === 'duration' || stored === 'interval' || stored === 'both') {
    return stored;
  }
  return 'both'; // Default to both charts
};

export const setChartDisplayMode = (mode: ChartDisplayMode): void => {
  localStorage.setItem(KEYS.CHART_DISPLAY_MODE, mode);
};

// Firebase user ID management
export const getFirebaseUserId = (): string | null => {
  return localStorage.getItem(KEYS.FIREBASE_USER_ID);
};

export const setFirebaseUserId = (userId: string): void => {
  localStorage.setItem(KEYS.FIREBASE_USER_ID, userId);
};

export const clearFirebaseUserId = (): void => {
  localStorage.removeItem(KEYS.FIREBASE_USER_ID);
};

// Sync backend management
export const getSyncBackend = (): SyncBackend => {
  const stored = localStorage.getItem(KEYS.SYNC_BACKEND);
  if (stored === 'firebase' || stored === 'googleSheets' || stored === 'none') {
    return stored;
  }
  // Default to 'none' if not set
  return 'none';
};

export const setSyncBackend = (backend: SyncBackend): void => {
  localStorage.setItem(KEYS.SYNC_BACKEND, backend);
};

// History management
export const getHistoryEntries = (): HistoryEntry[] => {
  const stored = localStorage.getItem(KEYS.HISTORY_ENTRIES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const setHistoryEntries = (entries: HistoryEntry[]): void => {
  localStorage.setItem(KEYS.HISTORY_ENTRIES, JSON.stringify(entries));
};

export const getHistoryPointer = (): number => {
  const stored = localStorage.getItem(KEYS.HISTORY_POINTER);
  return stored ? parseInt(stored, 10) : -1;
};

export const setHistoryPointer = (pointer: number): void => {
  localStorage.setItem(KEYS.HISTORY_POINTER, pointer.toString());
};

export const clearHistory = (): void => {
  localStorage.removeItem(KEYS.HISTORY_ENTRIES);
  localStorage.removeItem(KEYS.HISTORY_POINTER);
};

// Clear all stored data
export const clearAllLocalStorage = (): void => {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
