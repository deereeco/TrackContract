import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Contraction, TimerState } from '../types/contraction';
import { calculateDuration } from '../utils/calculations';
import { historyManager } from '../services/history/historyManager';
import { formatTime } from '../utils/dateTime';
import * as firestoreClient from '../services/firebase/firestoreClient';
import type { Unsubscribe } from 'firebase/firestore';
import { useSession } from './SessionContext';

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
      return { ...state, contractions: action.payload, loading: false };

    case 'ADD_CONTRACTION':
      return { ...state, contractions: [action.payload, ...state.contractions] };

    case 'UPDATE_CONTRACTION':
      return {
        ...state,
        contractions: state.contractions.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        )
      };

    case 'DELETE_CONTRACTION':
      return { ...state, contractions: state.contractions.filter(c => c.id !== action.payload) };

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
        timerState: { isRunning: true, startTime: now, elapsedTime: 0 },
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
        timerState: { isRunning: false, startTime: null, elapsedTime: 0 },
        activeContraction: null,
        contractions: [completedContraction, ...state.contractions]
      };
    }

    case 'UPDATE_TIMER':
      return { ...state, timerState: { ...state.timerState, elapsedTime: action.payload } };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

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
  const { activeSession } = useSession();
  const sessionId = activeSession?.id ?? null;

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

  // Subscribe to real-time contraction updates when session changes
  useEffect(() => {
    if (!sessionId) {
      dispatch({ type: 'SET_CONTRACTIONS', payload: [] });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    let unsubscribe: Unsubscribe | null = null;
    try {
      unsubscribe = firestoreClient.subscribeToContractions(sessionId, (remoteContractions) => {
        dispatch({ type: 'SET_CONTRACTIONS', payload: remoteContractions });
      });
    } catch (error) {
      console.error('Failed to subscribe to contractions:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }

    return () => {
      if (unsubscribe) firestoreClient.unsubscribeFromContractions(unsubscribe);
    };
  }, [sessionId]);

  // Update timer every second when running
  useEffect(() => {
    if (!state.timerState.isRunning || !state.timerState.startTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.timerState.startTime!) / 1000);
      dispatch({ type: 'UPDATE_TIMER', payload: elapsed });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.timerState.isRunning, state.timerState.startTime]);

  const startContraction = useCallback(() => {
    if (state.timerState.isRunning) return;
    dispatch({ type: 'START_TIMER' });
  }, [state.timerState.isRunning]);

  const stopContraction = useCallback(async (intensity?: number) => {
    if (!state.timerState.isRunning || !state.activeContraction || !sessionId) return;

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

    dispatch({ type: 'STOP_TIMER', payload: { endTime, duration, intensity } });

    try {
      await firestoreClient.addContraction(completedContraction, sessionId);
      const timeStr = formatTime(completedContraction.startTime);
      await historyManager.addEntry('create', `Created contraction at ${timeStr}`, completedContraction.id, undefined, completedContraction);
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to save contraction:', error);
    }
  }, [state.timerState.isRunning, state.activeContraction, sessionId, refreshHistoryState]);

  const addManualContraction = useCallback(async (
    contraction: Omit<Contraction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ) => {
    if (!sessionId) return;
    const now = Date.now();
    const newContraction: Contraction = { ...contraction, id: uuidv4(), createdAt: now, updatedAt: now, syncStatus: 'pending' };

    dispatch({ type: 'ADD_CONTRACTION', payload: newContraction });

    try {
      await firestoreClient.addContraction(newContraction, sessionId);
      const timeStr = formatTime(newContraction.startTime);
      await historyManager.addEntry('create', `Created manual contraction at ${timeStr}`, newContraction.id, undefined, newContraction);
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to add manual contraction:', error);
      dispatch({ type: 'DELETE_CONTRACTION', payload: newContraction.id });
      throw error;
    }
  }, [sessionId, refreshHistoryState]);

  const updateContraction = useCallback(async (id: string, updates: Partial<Contraction>) => {
    if (!sessionId) return;
    const contraction = state.contractions.find(c => c.id === id);
    dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates } });
    try {
      await firestoreClient.updateContraction(id, updates, sessionId);
      if (contraction) {
        const timeStr = formatTime(contraction.startTime);
        const newState = { ...contraction, ...updates };
        await historyManager.addEntry('update', `Edited contraction at ${timeStr}`, id, undefined, contraction, undefined, newState);
        refreshHistoryState();
      }
    } catch (error) {
      console.error('Failed to update contraction:', error);
      if (contraction) dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates: contraction } });
      throw error;
    }
  }, [state.contractions, sessionId, refreshHistoryState]);

  const deleteContraction = useCallback(async (id: string) => {
    if (!sessionId) return;
    const contraction = state.contractions.find(c => c.id === id);
    if (!contraction) return;

    const timeStr = formatTime(contraction.startTime);
    await historyManager.addEntry('delete', `Deleted contraction at ${timeStr}`, id, undefined, contraction);

    dispatch({ type: 'DELETE_CONTRACTION', payload: id });

    try {
      await firestoreClient.deleteContraction(id, sessionId);
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive contraction:', error);
      dispatch({ type: 'ADD_CONTRACTION', payload: contraction });
      throw error;
    }
  }, [state.contractions, sessionId, refreshHistoryState]);

  const archiveAllContractions = useCallback(async () => {
    if (!sessionId) return;
    const contractions = state.contractions;
    if (contractions.length === 0) return;

    try {
      const contractionIds = contractions.map(c => c.id);
      await historyManager.addEntry('archive_all', `Archived ${contractions.length} contractions`, undefined, contractionIds, undefined, contractions);
      await firestoreClient.batchArchive(contractionIds, sessionId);
      dispatch({ type: 'SET_CONTRACTIONS', payload: [] });
      refreshHistoryState();
    } catch (error) {
      console.error('Failed to archive all contractions:', error);
      throw error;
    }
  }, [state.contractions, sessionId, refreshHistoryState]);

  const restoreContraction = useCallback(async (id: string) => {
    if (!sessionId) return;
    try {
      await firestoreClient.restoreContraction(id, sessionId);
    } catch (error) {
      console.error('Failed to restore contraction:', error);
      throw error;
    }
  }, [sessionId]);

  const undo = useCallback(async () => {
    if (!historyManager.canUndo() || !sessionId) return;
    const entry = historyManager.getUndoEntry();
    if (!entry) return;

    try {
      switch (entry.actionType) {
        case 'create':
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            await firestoreClient.deleteContraction(entry.contractionId, sessionId);
          }
          break;
        case 'delete':
        case 'archive':
          if (entry.previousState) {
            const restored = { ...entry.previousState, archived: false, syncStatus: 'pending' as const };
            dispatch({ type: 'ADD_CONTRACTION', payload: restored });
            await firestoreClient.updateContraction(restored.id, { archived: false }, sessionId);
          }
          break;
        case 'archive_all':
          if (entry.previousStates) {
            for (const contraction of entry.previousStates) {
              const restored = { ...contraction, archived: false, syncStatus: 'pending' as const };
              dispatch({ type: 'ADD_CONTRACTION', payload: restored });
              await firestoreClient.updateContraction(restored.id, { archived: false }, sessionId);
            }
          }
          break;
        case 'update':
          if (entry.contractionId && entry.previousState) {
            dispatch({ type: 'UPDATE_CONTRACTION', payload: { id: entry.contractionId, updates: entry.previousState } });
            await firestoreClient.updateContraction(entry.contractionId, entry.previousState, sessionId);
          }
          break;
      }
      await historyManager.moveUndoPointer();
      refreshHistoryState();
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    }
  }, [sessionId, refreshHistoryState]);

  const redo = useCallback(async () => {
    if (!historyManager.canRedo() || !sessionId) return;
    const entry = historyManager.getRedoEntry();
    if (!entry) return;

    try {
      switch (entry.actionType) {
        case 'create':
          if (entry.previousState) {
            dispatch({ type: 'ADD_CONTRACTION', payload: entry.previousState });
            await firestoreClient.addContraction(entry.previousState, sessionId);
          }
          break;
        case 'delete':
        case 'archive':
          if (entry.contractionId) {
            dispatch({ type: 'DELETE_CONTRACTION', payload: entry.contractionId });
            await firestoreClient.deleteContraction(entry.contractionId, sessionId);
          }
          break;
        case 'archive_all':
          if (entry.contractionIds) {
            for (const id of entry.contractionIds) {
              dispatch({ type: 'DELETE_CONTRACTION', payload: id });
              await firestoreClient.deleteContraction(id, sessionId);
            }
          }
          break;
        case 'update':
          if (entry.contractionId && entry.newState) {
            dispatch({ type: 'UPDATE_CONTRACTION', payload: { id: entry.contractionId, updates: entry.newState } });
            await firestoreClient.updateContraction(entry.contractionId, entry.newState, sessionId);
          }
          break;
      }
      await historyManager.moveRedoPointer();
      refreshHistoryState();
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    }
  }, [sessionId, refreshHistoryState]);

  const refreshContractions = useCallback(async () => {
    if (!sessionId) return;
    try {
      const contractions = await firestoreClient.getAllContractions(sessionId);
      dispatch({ type: 'SET_CONTRACTIONS', payload: contractions });
    } catch (error) {
      console.error('Failed to refresh contractions:', error);
    }
  }, [sessionId]);

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
