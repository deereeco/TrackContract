import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '../types/session';
import { useAuth } from './AuthContext';
import {
  createSession as createSessionInFirestore,
  getSession,
  subscribeToSessions,
  updateSession as updateSessionInFirestore,
  deleteSession as deleteSessionInFirestore,
} from '../services/firebase/sessionClient';
import {
  getActiveSessionId,
  setActiveSessionId,
  clearActiveSessionId,
  getViewerSessionId,
  setViewerSessionId,
  clearViewerSessionId,
} from '../services/storage/localStorage';

interface SessionContextType {
  activeSession: Session | null;
  sessions: Session[];
  sessionsLoading: boolean;
  isOwner: boolean;
  selectSession: (id: string) => Promise<void>;
  createSession: (name: string) => Promise<string>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAnonymous } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Load sessions list for signed-in midwife
  useEffect(() => {
    if (!user || isAnonymous) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    const unsubscribe = subscribeToSessions(user.uid, (updated) => {
      setSessions(updated);
      setSessionsLoading(false);
    });

    return unsubscribe;
  }, [user, isAnonymous]);

  // Restore active session from localStorage on mount (after auth resolves)
  useEffect(() => {
    if (!user) return;

    const restoreSession = async () => {
      // Midwife: restore last active session (owned), then fall back to shared session
      if (!isAnonymous) {
        const storedId = getActiveSessionId();
        if (storedId && !activeSession) {
          const session = await getSession(storedId);
          if (session && session.ownerId === user.uid) {
            setActiveSession(session);
            return;
          } else {
            clearActiveSessionId();
          }
        }
        // Fallback: shared session accessed by Google user
        const viewerSessionId = getViewerSessionId();
        if (viewerSessionId && !activeSession) {
          const session = await getSession(viewerSessionId);
          if (session) setActiveSession(session);
        }
        return;
      }

      // Anonymous viewer: restore viewer session
      const viewerSessionId = getViewerSessionId();
      if (viewerSessionId && !activeSession) {
        const session = await getSession(viewerSessionId);
        if (session) {
          setActiveSession(session);
        }
      }
    };

    restoreSession();
  }, [user, isAnonymous]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSession = useCallback(async (id: string) => {
    const session = await getSession(id);
    if (!session) return;
    setActiveSession(session);
    if (isAnonymous || (user && session.ownerId !== user.uid)) {
      setViewerSessionId(id);
    } else {
      setActiveSessionId(id);
    }
  }, [isAnonymous, user]);

  const createSession = useCallback(async (name: string): Promise<string> => {
    if (!user || isAnonymous) throw new Error('Must be signed in to create a session');
    const id = await createSessionInFirestore(name, user.uid);
    const session = await getSession(id);
    if (session) {
      setActiveSession(session);
      setActiveSessionId(id);
    }
    return id;
  }, [user, isAnonymous]);

  const updateSession = useCallback(async (id: string, updates: Partial<Session>) => {
    await updateSessionInFirestore(id, updates);
    if (activeSession?.id === id) {
      setActiveSession(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [activeSession]);

  const deleteSession = useCallback(async (id: string) => {
    await deleteSessionInFirestore(id);
    if (activeSession?.id === id) {
      setActiveSession(null);
      clearActiveSessionId();
    }
  }, [activeSession]);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    clearActiveSessionId();
    clearViewerSessionId();
  }, []);

  const isOwner = !!(user && activeSession && !user.isAnonymous && user.uid === activeSession.ownerId);

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        sessions,
        sessionsLoading,
        isOwner,
        selectSession,
        createSession,
        updateSession,
        deleteSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
