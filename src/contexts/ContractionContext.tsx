import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Contraction, TimerState } from '../types/contraction';
import { dbOperations } from '../services/storage/db';
import { calculateDuration } from '../utils/calculations';
import { syncEngine } from '../services/sync/syncEngine';
import { historyManager } from '../services/history/historyManager';
import { formatTime } from '../utils/dateTime';

interface ContractionState {
  contractions: Contraction[];
  timerState: TimerState;
  activeContraction: Contraction | null;
  loading: boolean;
}

interface HistoryUIState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
}

type ContractionAction =
  | { type: 'SET_CONTRACTIONS'; payload: Contraction[] }
  | { type: 'ADD_CONTRACTION'; payload: Contraction }
  | { type: 'UPDATE_CONTRACTION'; payload: { id: string; updates: Partial<Contraction> } }
  | { type: 'DELETE_CONTRACTION'; payload: string }
  | { type: 'START_TIMER' }
  | { type: 'STOP_TIMER'; payload: { endTime: number; duration: number; intensity?: number } }
  | { type: 'UPDATE_TIMER'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: ContractionState = {
  contractions: [],
  timerState: {
    isRunning: false,
    startTime: null,
    elapsedTime: 0
  },
  activeContraction: null,
  loading: true
};

const contractionReducer = (state: ContractionState, action: ContractionAction): ContractionState => {
  switch (action.type) {
    case 'SET_CONTRACTIONS':
      return {
        ...state,
        contractions: action.payload,
        loading: false
      };

    case 'ADD_CONTRACTION':
      return {
        ...state,
        contractions: [action.payload, ...state.contractions]
      };

    case 'UPDATE_CONTRACTION':
      return {
        ...state,
        contractions: state.contractions.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        )
      };

    case 'DELETE_CONTRACTION':
      return {
        ...state,
        contractions: state.contractions.filter(c => c.id !== action.payload)
      };

    case 'START_TIMER': {
      const now = Date.now();
      const newContraction: Contraction = {
        id: uuidv4(),
        startTime: now,
        endTime: null,
        duration: null,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending'
      };

      return {
        ...state,
        timerState: {
          isRunning: true,
          startTime: now,
          elapsedTime: 0
        },
        activeContraction: newContraction
      };
    }

    case 'STOP_TIMER': {
      if (!state.activeContraction) return state;

      const completedContraction: Contraction = {
        ...state.activeContraction,
        endTime: action.payload.endTime,
        duration: action.payload.duration,
        intensity: action.payload.intensity,
        updatedAt: action.payload.endTime,
        syncStatus: 'pending'
      };

      return {
        ...state,
        timerState: {
          isRunning: false,
          startTime: null,
          elapsedTime: 0
        },
        activeContraction: null,
        contractions: [completedContraction, ...state.contractions]
      };
    }

    case 'UPDATE_TIMER':
      return {
        ...state,
        timerState: {
          ...state.timerState,
          elapsedTime: action.payload
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    default:
      return state;
  }
};

interface ContractionContextType {
  state: ContractionState;
  startContraction: () => void;
  stopContraction: (intensity?: number) => void;
  addManualContraction: (contraction: Omit<Contraction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateContraction: (id: string, updates: Partial<Contraction>) => Promise<void>;
  deleteContraction: (id: string) => Promise<void>;
  archiveAllContractions: () => Promise<void>;
  refreshContractions: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
}

const ContractionContext = createContext<ContractionContextType | undefined>(undefined);

export const ContractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(contractionReducer, initialState);
  const [historyState, setHistoryState] = useState<HistoryUIState>({
    canUndo: historyManager.canUndo(),
    canRedo: historyManager.canRedo(),
    undoDescription: historyManager.getUndoDescription(),
    redoDescription: historyManager.getRedoDescription(),
  });

  const refreshHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo(),
      undoDescription: historyManager.getUndoDescription(),
      redoDescription: historyManager.getRedoDescription(),
    });
  }, []);

  // Load contractions from IndexedDB on mount
  useEffect(() => {
    const loadContractions = async () => {
      try {
        const contractions = await dbOperations.getAllContractions();
        dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
      } catch (error) {
        console.error('Failed to load contractions:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadContractions();
  }, []);

  // Update timer every second when running
  useEffect(() => {
    if (!state.timerState.isRunning || !state.timerState.startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.timerState.startTime!) / 1000);
      dispatch({ type: 'UPDATE_TIMER', payload: elapsed });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timerState.isRunning, state.timerState.startTime]);

  // Listen for sync completion and refresh contractions
  useEffect(() => {
    const handleSyncCompleted = async () => {
      const contractions = await dbOperations.getAllContractions();
      dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
    };

    window.addEventListener('sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('sync-completed', handleSyncCompleted);
  }, []);

  const startContraction = useCallback(() => {
    if (state.timerState.isRunning) return;
    dispatch({ type: 'START_TIMER' });
  }, [state.timerState.isRunning]);

  const stopContraction = useCallback(async (intensity?: number) => {
    if (!state.timerState.isRunning || !state.activeContraction) return;

    const endTime = Date.now();
    const duration = calculateDuration(state.activeContraction.startTime, endTime);

    dispatch({ type: 'STOP_TIMER', payload: { endTime, duration, intensity } });

    // Save to IndexedDB
    const completedContraction: Contraction = {
      ...state.activeContraction,
      endTime,
      duration,
      intensity,
      updatedAt: endTime,
      syncStatus: 'pending'
    };

    try {
      await dbOperations.addContraction(completedContraction);

      // Queue for sync
      await syncEngine.queueContraction('create', completedContraction.id, completedContraction);

      // Add to history
      const timeStr = formatTime(completedContraction.startTime);
      await historyManager.addEntry(
        'create',
        `Created contraction at ${timeStr}`,
        completedContraction.id,
        undefined,
        completedContraction
      );
    } catch (error) {
      console.error('Failed to save contraction:', error);
    }
  }, [state.timerState.isRunning, state.activeContraction]);

  const addManualContraction = useCallback(async (
    contraction: Omit<Contraction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ) => {
    const now = Date.now();
    const newContraction: Contraction = {
      ...contraction,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    dispatch({ type: 'ADD_CONTRACTION', payload: newContraction });

    try {
      await dbOperations.addContraction(newContraction);

      // Queue for sync
      await syncEngine.queueContraction('create', newContraction.id, newContraction);

      // Add to history
      const timeStr = formatTime(newContraction.startTime);
      await historyManager.addEntry(
        'create',
        `Created manual contraction at ${timeStr}`,
        newContraction.id,
        undefined,
        newContraction
      );
    } catch (error) {
      console.error('Failed to add manual contraction:', error);
      throw error;
    }
  }, []);

  const updateContraction = useCallback(async (id: string, updates: Partial<Contraction>) => {
    dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates } });

    try {
      const contraction = await dbOperations.getContraction(id);
      await dbOperations.updateContraction(id, updates);

      // Queue for sync if the update is user-facing (not internal sync updates)
      if (contraction && !updates.syncStatus && !updates.syncedAt) {
        await syncEngine.queueContraction('update', id, { ...contraction, ...updates });
      }
    } catch (error) {
      console.error('Failed to update contraction:', error);
      throw error;
    }
  }, []);

  const deleteContraction = useCallback(async (id: string) => {
    const contraction = await dbOperations.getContraction(id);
    if (!contraction) return;

    // Add to history before deleting
    const timeStr = formatTime(contraction.startTime);
    await historyManager.addEntry(
      'delete',
      `Deleted contraction at ${timeStr}`,
      id,
      undefined,
      contraction
    );

    dispatch({ type: 'DELETE_CONTRACTION', payload: id });

    try {
      // Archive instead of physical delete
      await dbOperations.updateContraction(id, {
        archived: true,
        syncStatus: 'pending'
      });
      await syncEngine.queueContraction('archive', id, contraction);

      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive contraction:', error);
      throw error;
    }
  }, [refreshHistoryState]);

  const archiveAllContractions = useCallback(async () => {
    const contractions = state.contractions;
    if (contractions.length === 0) return;

    try {
      const contractionIds = contractions.map(c => c.id);

      // Add to history before archiving
      await historyManager.addEntry(
        'archive_all',
        `Archived ${contractions.length} contractions`,
        undefined,
        contractionIds,
        undefined,
        contractions
      );

      // Archive all via sync engine
      await syncEngine.queueArchiveAll(contractionIds);

      // Clear UI
      dispatch({ type: 'SET_CONTRACTIONS', payload: [] });

      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive all contractions:', error);
      throw error;
    }
  }, [state.contractions, refreshHistoryState]);

  const undo = useCallback(async () => {
    if (!historyManager.canUndo()) return;

    const entry = historyManager.getUndoEntry();
    if (!entry) return;

    try {
      switch (entry.actionType) {
        case 'create':
          // Undo create: delete the contraction
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            await dbOperations.deleteContraction(entry.contractionId);
          }
          break;

        case 'delete':
        case 'archive':
          // Undo delete/archive: restore the contraction
          if (entry.previousState) {
            const restored = { ...entry.previousState, archived: false, syncStatus: 'pending' as const };
            dispatch({ type: 'ADD_CONTRACTION', payload: restored });
            await dbOperations.updateContraction(restored.id, { archived: false });
          }
          break;

        case 'archive_all':
          // Undo archive all: restore all contractions
          if (entry.previousStates) {
            for (const contraction of entry.previousStates) {
              const restored = { ...contraction, archived: false, syncStatus: 'pending' as const };
              dispatch({ type: 'ADD_CONTRACTION', payload: restored });
              await dbOperations.updateContraction(restored.id, { archived: false });
            }
          }
          break;
      }

      await historyManager.moveUndoPointer();
      refreshHistoryState();
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    }
  }, [refreshHistoryState]);

  const redo = useCallback(async () => {
    if (!historyManager.canRedo()) return;

    const entry = historyManager.getRedoEntry();
    if (!entry) return;

    try {
      switch (entry.actionType) {
        case 'create':
          // Redo create: re-add the contraction
          if (entry.previousState) {
            dispatch({ type: 'ADD_CONTRACTION', payload: entry.previousState });
            await dbOperations.addContraction(entry.previousState);
          }
          break;

        case 'delete':
        case 'archive':
          // Redo delete/archive: remove again
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            await dbOperations.updateContraction(entry.contractionId, { archived: true });
          }
          break;

        case 'archive_all':
          // Redo archive all: remove all again
          if (entry.contractionIds) {
            for (const id of entry.contractionIds) {
              dispatch({ type: 'DELETE_CONTRACTION', payload: id });
              await dbOperations.updateContraction(id, { archived: true });
            }
          }
          break;
      }

      await historyManager.moveRedoPointer();
      refreshHistoryState();
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    }
  }, [refreshHistoryState]);

  const refreshContractions = useCallback(async () => {
    try {
      const contractions = await dbOperations.getAllContractions();
      dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
    } catch (error) {
      console.error('Failed to refresh contractions:', error);
    }
  }, []);

  return (
    <ContractionContext.Provider
      value={{
        state,
        startContraction,
        stopContraction,
        addManualContraction,
        updateContraction,
        deleteContraction,
        archiveAllContractions,
        refreshContractions,
        undo,
        redo,
        canUndo: historyState.canUndo,
        canRedo: historyState.canRedo,
        undoDescription: historyState.undoDescription,
        redoDescription: historyState.redoDescription,
      }}
    >
      {children}
    </ContractionContext.Provider>
  );
};

export const useContractions = () => {
  const context = useContext(ContractionContext);
  if (context === undefined) {
    throw new Error('useContractions must be used within a ContractionProvider');
  }
  return context;
};
