import { Contraction } from './contraction';

export type HistoryActionType = 'create' | 'delete' | 'archive' | 'archive_all' | 'update';

export interface HistoryEntry {
  id: string;
  actionType: HistoryActionType;
  timestamp: number;
  contractionId?: string;
  contractionIds?: string[];
  previousState?: Contraction;
  previousStates?: Contraction[];
  description: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxSize: number;
}
