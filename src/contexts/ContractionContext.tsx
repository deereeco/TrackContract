import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Contraction, TimerState } from '../types/contraction';
import { calculateDuration } from '../utils/calculations';
import { historyManager } from '../services/history/historyManager';
import { formatTime } from '../utils/dateTime';
import { getSyncBackend } from '../services/storage/localStorage';
import * as firestoreClient from '../services/firebase/firestoreClient';
import type { Unsubscribe } from 'firebase/firestore';

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
  restoreContraction: (id: string) => Promise<void>;
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

  // Load contractions on mount based on backend
  useEffect(() => {
    const loadContractions = async () => {
      try {
        const backend = getSyncBackend();

        if (backend === 'firebase') {
          // Wait for auth to be ready before loading
          const auth = await import('../config/firebase').then(m => m.getFirebaseAuth());

          // Wait for auth to initialize (max 5 seconds)
          let attempts = 0;
          while (!auth.currentUser && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (auth.currentUser) {
            // Load from Firebase (already cached offline by Firebase)
            const contractions = await firestoreClient.getAllContractions();
            dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
          } else {
            console.warn('Auth not ready after 5 seconds');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          // Local-only mode: no persistence, just empty state
          dispatch({ type: 'SET_LOADING', payload: false });
        }
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

  // Firebase real-time sync listener
  useEffect(() => {
    const backend = getSyncBackend();
    if (backend !== 'firebase') return;

    let unsubscribe: Unsubscribe | null = null;

    const setupRealtimeSync = async () => {
      try {
        // Wait for auth to be ready
        const auth = await import('../config/firebase').then(m => m.getFirebaseAuth());

        let attempts = 0;
        while (!auth.currentUser && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (auth.currentUser) {
          unsubscribe = firestoreClient.subscribeToContractions((remoteContractions) => {
            // Firebase handles merging, just update UI
            dispatch({ type: 'SET_CONTRACTIONS', payload: remoteContractions });
          });
        } else {
          console.warn('Auth not ready for real-time sync');
        }
      } catch (error) {
        console.error('Failed to set up Firebase real-time sync:', error);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubscribe) {
        firestoreClient.unsubscribeFromContractions(unsubscribe);
      }
    };
  }, []);

  const startContraction = useCallback(() => {
    if (state.timerState.isRunning) return;
    dispatch({ type: 'START_TIMER' });
  }, [state.timerState.isRunning]);

  const stopContraction = useCallback(async (intensity?: number) => {
    if (!state.timerState.isRunning || !state.activeContraction) return;

    const endTime = Date.now();
    const duration = calculateDuration(state.activeContraction.startTime, endTime);

    const completedContraction: Contraction = {
      ...state.activeContraction,
      endTime,
      duration,
      intensity,
      updatedAt: endTime,
      syncStatus: 'pending'
    };

    // Update UI immediately (optimistic)
    dispatch({ type: 'STOP_TIMER', payload: { endTime, duration, intensity } });

    try {
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Save to Firebase (offline persistence handles caching)
        await firestoreClient.addContraction(completedContraction);
      }

      // Add to history
      const timeStr = formatTime(completedContraction.startTime);
      await historyManager.addEntry(
        'create',
        `Created contraction at ${timeStr}`,
        completedContraction.id,
        undefined,
        completedContraction
      );
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to save contraction:', error);
    }
  }, [state.timerState.isRunning, state.activeContraction, refreshHistoryState]);

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

    // Update UI immediately (optimistic)
    dispatch({ type: 'ADD_CONTRACTION', payload: newContraction });

    try {
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Save to Firebase
        await firestoreClient.addContraction(newContraction);
      }

      // Add to history
      const timeStr = formatTime(newContraction.startTime);
      await historyManager.addEntry(
        'create',
        `Created manual contraction at ${timeStr}`,
        newContraction.id,
        undefined,
        newContraction
      );
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to add manual contraction:', error);
      // Revert UI on error
      dispatch({ type: 'DELETE_CONTRACTION', payload: newContraction.id });
      throw error;
    }
  }, [refreshHistoryState]);

  const updateContraction = useCallback(async (id: string, updates: Partial<Contraction>) => {
    // Find the contraction before updating
    const contraction = state.contractions.find(c => c.id === id);

    // Update UI immediately (optimistic)
    dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates } });

    try {
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Update in Firebase
        await firestoreClient.updateContraction(id, updates);
      }
    } catch (error) {
      console.error('Failed to update contraction:', error);
      // Revert UI on error
      if (contraction) {
        dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates: contraction } });
      }
      throw error;
    }
  }, [state.contractions]);

  const deleteContraction = useCallback(async (id: string) => {
    const contraction = state.contractions.find(c => c.id === id);
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

    // Update UI immediately (optimistic)
    dispatch({ type: 'DELETE_CONTRACTION', payload: id });

    try {
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Archive in Firebase
        await firestoreClient.archiveContraction(id);
      }

      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive contraction:', error);
      // Revert UI on error
      dispatch({ type: 'ADD_CONTRACTION', payload: contraction });
      throw error;
    }
  }, [state.contractions, refreshHistoryState]);

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

      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Batch archive in Firebase
        await firestoreClient.batchArchive(contractionIds);
      }

      // Clear UI
      dispatch({ type: 'SET_CONTRACTIONS', payload: [] });

      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive all contractions:', error);
      throw error;
    }
  }, [state.contractions, refreshHistoryState]);

  const restoreContraction = useCallback(async (id: string) => {
    try {
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        // Restore in Firebase
        await firestoreClient.restoreContraction(id);
        // Real-time listener will update UI automatically
      }
    } catch (error) {
      console.error('Failed to restore contraction:', error);
      throw error;
    }
  }, []);

  const undo = useCallback(async () => {
    if (!historyManager.canUndo()) return;

    const entry = historyManager.getUndoEntry();
    if (!entry) return;

    try {
      const backend = getSyncBackend();

      switch (entry.actionType) {
        case 'create':
          // Undo create: delete the contraction
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            if (backend === 'firebase') {
              await firestoreClient.archiveContraction(entry.contractionId);
            }
          }
          break;

        case 'delete':
        case 'archive':
          // Undo delete/archive: restore the contraction
          if (entry.previousState) {
            const restored = { ...entry.previousState, archived: false, syncStatus: 'pending' as const };
            dispatch({ type: 'ADD_CONTRACTION', payload: restored });
            if (backend === 'firebase') {
              await firestoreClient.updateContraction(restored.id, { archived: false });
            }
          }
          break;

        case 'archive_all':
          // Undo archive all: restore all contractions
          if (entry.previousStates) {
            for (const contraction of entry.previousStates) {
              const restored = { ...contraction, archived: false, syncStatus: 'pending' as const };
              dispatch({ type: 'ADD_CONTRACTION', payload: restored });
              if (backend === 'firebase') {
                await firestoreClient.updateContraction(restored.id, { archived: false });
              }
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
      const backend = getSyncBackend();

      switch (entry.actionType) {
        case 'create':
          // Redo create: re-add the contraction
          if (entry.previousState) {
            dispatch({ type: 'ADD_CONTRACTION', payload: entry.previousState });
            if (backend === 'firebase') {
              await firestoreClient.addContraction(entry.previousState);
            }
          }
          break;

        case 'delete':
        case 'archive':
          // Redo delete/archive: remove again
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            if (backend === 'firebase') {
              await firestoreClient.archiveContraction(entry.contractionId);
            }
          }
          break;

        case 'archive_all':
          // Redo archive all: remove all again
          if (entry.contractionIds) {
            for (const id of entry.contractionIds) {
              dispatch({ type: 'DELETE_CONTRACTION', payload: id });
              if (backend === 'firebase') {
                await firestoreClient.archiveContraction(id);
              }
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
      const backend = getSyncBackend();
      if (backend === 'firebase') {
        const contractions = await firestoreClient.getAllContractions();
        dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
      }
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
        restoreContraction,
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
