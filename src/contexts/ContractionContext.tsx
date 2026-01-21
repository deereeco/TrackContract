import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Contraction, TimerState } from '../types/contraction';
import { dbOperations } from '../services/storage/db';
import { calculateDuration } from '../utils/calculations';

interface ContractionState {
  contractions: Contraction[];
  timerState: TimerState;
  activeContraction: Contraction | null;
  loading: boolean;
}

type ContractionAction =
  | { type: 'SET_CONTRACTIONS'; payload: Contraction[] }
  | { type: 'ADD_CONTRACTION'; payload: Contraction }
  | { type: 'UPDATE_CONTRACTION'; payload: { id: string; updates: Partial<Contraction> } }
  | { type: 'DELETE_CONTRACTION'; payload: string }
  | { type: 'START_TIMER' }
  | { type: 'STOP_TIMER'; payload: { endTime: number; duration: number } }
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
  stopContraction: () => void;
  addManualContraction: (contraction: Omit<Contraction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => Promise<void>;
  updateContraction: (id: string, updates: Partial<Contraction>) => Promise<void>;
  deleteContraction: (id: string) => Promise<void>;
  refreshContractions: () => Promise<void>;
}

const ContractionContext = createContext<ContractionContextType | undefined>(undefined);

export const ContractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(contractionReducer, initialState);

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

  const startContraction = useCallback(() => {
    if (state.timerState.isRunning) return;
    dispatch({ type: 'START_TIMER' });
  }, [state.timerState.isRunning]);

  const stopContraction = useCallback(async () => {
    if (!state.timerState.isRunning || !state.activeContraction) return;

    const endTime = Date.now();
    const duration = calculateDuration(state.activeContraction.startTime, endTime);

    dispatch({ type: 'STOP_TIMER', payload: { endTime, duration } });

    // Save to IndexedDB
    const completedContraction: Contraction = {
      ...state.activeContraction,
      endTime,
      duration,
      updatedAt: endTime,
      syncStatus: 'pending'
    };

    try {
      await dbOperations.addContraction(completedContraction);
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
    } catch (error) {
      console.error('Failed to add manual contraction:', error);
      throw error;
    }
  }, []);

  const updateContraction = useCallback(async (id: string, updates: Partial<Contraction>) => {
    dispatch({ type: 'UPDATE_CONTRACTION', payload: { id, updates } });

    try {
      await dbOperations.updateContraction(id, updates);
    } catch (error) {
      console.error('Failed to update contraction:', error);
      throw error;
    }
  }, []);

  const deleteContraction = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_CONTRACTION', payload: id });

    try {
      await dbOperations.deleteContraction(id);
    } catch (error) {
      console.error('Failed to delete contraction:', error);
      throw error;
    }
  }, []);

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
        refreshContractions
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
