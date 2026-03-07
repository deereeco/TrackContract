import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  writeBatch,
  Unsubscribe,
  orderBy,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../config/firebase';
import { Contraction } from '../../types/contraction';
import {
  getFirebaseUserId,
  setFirebaseUserId,
} from '../storage/localStorage';

/**
 * Get the Firestore collection reference for contractions in a session
 */
const getContractionsCollection = (sessionId: string) => {
  const db = getFirebaseDb();
  return collection(db, 'sessions', sessionId, 'contractions');
};

/**
 * Legacy: get collection for old anonymous UUID-based path
 */
const getLegacyContractionsCollection = () => {
  const db = getFirebaseDb();
  const userId = getLegacyUserId();
  return collection(db, 'users', userId, 'contractions');
};

/**
 * Legacy: get or create userId for old share-link format
 */
export const getLegacyUserId = (): string => {
  let userId = getFirebaseUserId();
  if (!userId) {
    userId = crypto.randomUUID();
    setFirebaseUserId(userId);
  }
  return userId;
};

/**
 * Legacy: set userId from old-style #userId= share link
 */
export const setUserIdFromShareLink = (userId: string): void => {
  setFirebaseUserId(userId);
};

/**
 * Convert Firestore Timestamp to Unix timestamp (milliseconds)
 */
const timestampToNumber = (timestamp: any): number => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return timestamp;
};

/**
 * Convert Firestore document to Contraction object
 */
const documentToContraction = (doc: DocumentData): Contraction => {
  const data = doc.data();
  return {
    id: doc.id,
    startTime: timestampToNumber(data.startTime),
    endTime: data.endTime ? timestampToNumber(data.endTime) : null,
    duration: data.duration ?? null,
    intensity: data.intensity ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: timestampToNumber(data.createdAt),
    updatedAt: timestampToNumber(data.updatedAt),
    syncStatus: 'synced',
    syncedAt: Date.now(),
    archived: data.archived ?? false,
  };
};

/**
 * Convert Contraction object to Firestore document data
 */
const contractionToDocument = (contraction: Contraction): any => {
  const docData: any = {
    startTime: contraction.startTime,
    endTime: contraction.endTime,
    duration: contraction.duration,
    createdAt: contraction.createdAt,
    updatedAt: contraction.updatedAt,
    archived: contraction.archived ?? false,
  };
  if (contraction.intensity !== undefined) docData.intensity = contraction.intensity;
  if (contraction.notes !== undefined) docData.notes = contraction.notes;
  return docData;
};

// ─── Session-scoped operations ────────────────────────────────────────────────

export const addContraction = async (
  contraction: Contraction,
  sessionId: string
): Promise<string> => {
  try {
    const contractionsRef = getContractionsCollection(sessionId);
    const docData = contractionToDocument(contraction);
    const docRef = doc(contractionsRef, contraction.id);
    await updateDoc(docRef, docData).catch(async () => {
      await addDoc(contractionsRef, { ...docData, id: contraction.id });
    });
    return contraction.id;
  } catch (error) {
    console.error('Error adding contraction to Firestore:', error);
    throw error;
  }
};

export const updateContraction = async (
  id: string,
  updates: Partial<Contraction>,
  sessionId: string
): Promise<void> => {
  try {
    const contractionsRef = getContractionsCollection(sessionId);
    const docRef = doc(contractionsRef, id);
    const docUpdates: any = {};
    if (updates.startTime !== undefined) docUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) docUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) docUpdates.duration = updates.duration;
    if (updates.intensity !== undefined) docUpdates.intensity = updates.intensity;
    if (updates.notes !== undefined) docUpdates.notes = updates.notes;
    if (updates.archived !== undefined) docUpdates.archived = updates.archived;
    docUpdates.updatedAt = updates.updatedAt ?? Date.now();
    await updateDoc(docRef, docUpdates);
  } catch (error) {
    console.error('Error updating contraction in Firestore:', error);
    throw error;
  }
};

export const deleteContraction = async (id: string, sessionId: string): Promise<void> => {
  try {
    await updateContraction(id, { archived: true, updatedAt: Date.now() }, sessionId);
  } catch (error) {
    console.error('Error deleting contraction in Firestore:', error);
    throw error;
  }
};

export const restoreContraction = async (id: string, sessionId: string): Promise<void> => {
  try {
    await updateContraction(id, { archived: false, updatedAt: Date.now() }, sessionId);
  } catch (error) {
    console.error('Error restoring contraction in Firestore:', error);
    throw error;
  }
};

export const permanentlyDeleteContraction = async (id: string, sessionId: string): Promise<void> => {
  try {
    const contractionsRef = getContractionsCollection(sessionId);
    const docRef = doc(contractionsRef, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error permanently deleting contraction in Firestore:', error);
    throw error;
  }
};

export const getAllContractions = async (
  sessionId: string,
  includeArchived: boolean = false
): Promise<Contraction[]> => {
  try {
    const contractionsRef = getContractionsCollection(sessionId);
    const q = includeArchived
      ? query(contractionsRef, orderBy('startTime', 'desc'))
      : query(contractionsRef, where('archived', '==', false), orderBy('startTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => documentToContraction(doc));
  } catch (error) {
    console.error('Error getting contractions from Firestore:', error);
    throw error;
  }
};

export const subscribeToContractions = (
  sessionId: string,
  callback: (contractions: Contraction[]) => void,
  includeArchived: boolean = false
): Unsubscribe => {
  try {
    const contractionsRef = getContractionsCollection(sessionId);
    const q = includeArchived
      ? query(contractionsRef, orderBy('startTime', 'desc'))
      : query(contractionsRef, where('archived', '==', false), orderBy('startTime', 'desc'));
    return onSnapshot(q,
      snapshot => callback(snapshot.docs.map(doc => documentToContraction(doc))),
      error => console.error('Error in Firestore subscription:', error)
    );
  } catch (error) {
    console.error('Error subscribing to Firestore:', error);
    throw error;
  }
};

export const unsubscribeFromContractions = (unsubscribe: Unsubscribe): void => {
  if (unsubscribe) unsubscribe();
};

export const batchArchive = async (ids: string[], sessionId: string): Promise<void> => {
  try {
    const db = getFirebaseDb();
    const contractionsRef = getContractionsCollection(sessionId);
    const batch = writeBatch(db);
    const now = Date.now();
    ids.forEach(id => batch.update(doc(contractionsRef, id), { archived: true, updatedAt: now }));
    await batch.commit();
  } catch (error) {
    console.error('Error batch archiving contractions in Firestore:', error);
    throw error;
  }
};

export const batchDelete = async (ids: string[], sessionId: string): Promise<void> => {
  try {
    const db = getFirebaseDb();
    const contractionsRef = getContractionsCollection(sessionId);
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(contractionsRef, id)));
    await batch.commit();
  } catch (error) {
    console.error('Error batch deleting contractions in Firestore:', error);
    throw error;
  }
};

// ─── Legacy operations (for old #userId= share links) ────────────────────────

export const legacySubscribeToContractions = (
  callback: (contractions: Contraction[]) => void
): Unsubscribe => {
  const contractionsRef = getLegacyContractionsCollection();
  const q = query(contractionsRef, where('archived', '==', false), orderBy('startTime', 'desc'));
  return onSnapshot(q,
    snapshot => callback(snapshot.docs.map(doc => documentToContraction(doc))),
    error => console.error('Error in legacy Firestore subscription:', error)
  );
};

export const legacyAddContraction = async (contraction: Contraction): Promise<string> => {
  const contractionsRef = getLegacyContractionsCollection();
  const docData = contractionToDocument(contraction);
  const docRef = doc(contractionsRef, contraction.id);
  await updateDoc(docRef, docData).catch(async () => {
    await addDoc(contractionsRef, { ...docData, id: contraction.id });
  });
  return contraction.id;
};

export const legacyUpdateContraction = async (
  id: string,
  updates: Partial<Contraction>
): Promise<void> => {
  const contractionsRef = getLegacyContractionsCollection();
  const docRef = doc(contractionsRef, id);
  const docUpdates: any = { updatedAt: updates.updatedAt ?? Date.now() };
  if (updates.startTime !== undefined) docUpdates.startTime = updates.startTime;
  if (updates.endTime !== undefined) docUpdates.endTime = updates.endTime;
  if (updates.duration !== undefined) docUpdates.duration = updates.duration;
  if (updates.intensity !== undefined) docUpdates.intensity = updates.intensity;
  if (updates.notes !== undefined) docUpdates.notes = updates.notes;
  if (updates.archived !== undefined) docUpdates.archived = updates.archived;
  await updateDoc(docRef, docUpdates);
};

// Keep getUserId exported for backward compat (used in Settings for display)
export const getUserId = getLegacyUserId;
