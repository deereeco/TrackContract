import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../config/firebase';
import { Session } from '../../types/session';

const sessionsCollection = () => collection(getFirebaseDb(), 'sessions');

const docToSession = (id: string, data: any): Session => ({
  id,
  name: data.name,
  ownerId: data.ownerId,
  createdAt: data.createdAt,
  active: data.active ?? true,
  shareToken: data.shareToken,
});

export const createSession = async (name: string, ownerId: string): Promise<string> => {
  const ref = await addDoc(sessionsCollection(), {
    name,
    ownerId,
    createdAt: Date.now(),
    active: true,
    shareToken: crypto.randomUUID(),
  });
  return ref.id;
};

export const getSession = async (sessionId: string): Promise<Session | null> => {
  const snap = await getDoc(doc(sessionsCollection(), sessionId));
  if (!snap.exists()) return null;
  return docToSession(snap.id, snap.data());
};

export const getSessions = async (ownerId: string): Promise<Session[]> => {
  const q = query(sessionsCollection(), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => docToSession(d.id, d.data()));
};

export const subscribeToSessions = (
  ownerId: string,
  callback: (sessions: Session[]) => void
): Unsubscribe => {
  const q = query(sessionsCollection(), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => docToSession(d.id, d.data())));
  });
};

export const updateSession = async (id: string, updates: Partial<Session>): Promise<void> => {
  await updateDoc(doc(sessionsCollection(), id), updates as any);
};

export const deleteSession = async (id: string): Promise<void> => {
  await deleteDoc(doc(sessionsCollection(), id));
};

export const resolveShareToken = async (token: string): Promise<string | null> => {
  const q = query(sessionsCollection(), where('shareToken', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
};

export const getShareLink = (shareToken: string): string => {
  const base = window.location.origin + window.location.pathname;
  return `${base}#token=${shareToken}`;
};
