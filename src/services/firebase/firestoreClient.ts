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
import { getFirebaseDb, getFirebaseAuth } from '../../config/firebase';
import { Contraction } from '../../types/contraction';
import {
  getFirebaseUserId,
  setFirebaseUserId,
} from '../storage/localStorage';

/**
 * Get or create userId for Firestore
 * This userId is used to isolate user data and enable link sharing
 * IMPORTANT: Uses Firebase Auth UID to match security rules
 */
export const getUserId = (): string => {
  const auth = getFirebaseAuth();

  // Use the Firebase Auth user ID if available
  if (auth.currentUser) {
    const userId = auth.currentUser.uid;
    setFirebaseUserId(userId); // Sync to localStorage
    return userId;
  }

  // Fallback to localStorage (for before auth completes)
  let userId = getFirebaseUserId();
  if (userId) {
    return userId;
  }

  // This shouldn't happen if auth is properly initialized
  console.warn('getUserId called before authentication completed');
  return '';
};

/**
 * Get the Firestore collection reference for contractions
 */
const getContractionsCollection = () => {
  const db = getFirebaseDb();
  const userId = getUserId();
  return collection(db, 'users', userId, 'contractions');
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
    syncStatus: 'synced', // Always synced if coming from Firestore
    syncedAt: Date.now(),
    archived: data.archived ?? false,
  };
};

/**
 * Convert Contraction object to Firestore document data
 * Filters out undefined values (Firestore doesn't support undefined)
 */
const contractionToDocument = (contraction: Contraction): any => {
  const doc: any = {
    startTime: contraction.startTime,
    endTime: contraction.endTime,
    duration: contraction.duration,
    createdAt: contraction.createdAt,
    updatedAt: contraction.updatedAt,
    archived: contraction.archived ?? false,
  };

  // Only include optional fields if they're defined
  if (contraction.intensity !== undefined) {
    doc.intensity = contraction.intensity;
  }
  if (contraction.notes !== undefined) {
    doc.notes = contraction.notes;
  }

  return doc;
};

/**
 * Add a new contraction to Firestore
 */
export const addContraction = async (
  contraction: Contraction
): Promise<string> => {
  try {
    const contractionsRef = getContractionsCollection();
    const docData = contractionToDocument(contraction);

    // Use the contraction's ID as the document ID
    const docRef = doc(contractionsRef, contraction.id);
    await updateDoc(docRef, docData).catch(async () => {
      // Document doesn't exist, create it
      await addDoc(contractionsRef, {
        ...docData,
        id: contraction.id,
      });
    });

    return contraction.id;
  } catch (error) {
    console.error('Error adding contraction to Firestore:', error);
    throw error;
  }
};

/**
 * Update an existing contraction in Firestore
 */
export const updateContraction = async (
  id: string,
  updates: Partial<Contraction>
): Promise<void> => {
  try {
    const contractionsRef = getContractionsCollection();
    const docRef = doc(contractionsRef, id);

    // Convert updates to Firestore format
    const docUpdates: any = {};
    if (updates.startTime !== undefined)
      docUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) docUpdates.endTime = updates.endTime;
    if (updates.duration !== undefined) docUpdates.duration = updates.duration;
    if (updates.intensity !== undefined)
      docUpdates.intensity = updates.intensity;
    if (updates.notes !== undefined) docUpdates.notes = updates.notes;
    if (updates.archived !== undefined) docUpdates.archived = updates.archived;

    // Always update updatedAt timestamp
    docUpdates.updatedAt = updates.updatedAt ?? Date.now();

    await updateDoc(docRef, docUpdates);
  } catch (error) {
    console.error('Error updating contraction in Firestore:', error);
    throw error;
  }
};

/**
 * Delete a contraction from Firestore (soft delete)
 */
export const deleteContraction = async (id: string): Promise<void> => {
  try {
    await updateContraction(id, {
      archived: true,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error deleting contraction in Firestore:', error);
    throw error;
  }
};

/**
 * Archive a contraction (alias for delete)
 */
export const archiveContraction = async (id: string): Promise<void> => {
  return deleteContraction(id);
};

/**
 * Permanently delete a contraction from Firestore
 * Use with caution - this is irreversible
 */
export const permanentlyDeleteContraction = async (
  id: string
): Promise<void> => {
  try {
    const contractionsRef = getContractionsCollection();
    const docRef = doc(contractionsRef, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error permanently deleting contraction in Firestore:', error);
    throw error;
  }
};

/**
 * Get all contractions from Firestore
 */
export const getAllContractions = async (
  includeArchived: boolean = false
): Promise<Contraction[]> => {
  try {
    const contractionsRef = getContractionsCollection();

    // Query contractions
    const q = includeArchived
      ? query(contractionsRef, orderBy('startTime', 'desc'))
      : query(
          contractionsRef,
          where('archived', '==', false),
          orderBy('startTime', 'desc')
        );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => documentToContraction(doc));
  } catch (error) {
    console.error('Error getting contractions from Firestore:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for contractions
 * Returns an unsubscribe function
 */
export const subscribeToContractions = (
  callback: (contractions: Contraction[]) => void,
  includeArchived: boolean = false
): Unsubscribe => {
  try {
    const contractionsRef = getContractionsCollection();

    // Query contractions
    const q = includeArchived
      ? query(contractionsRef, orderBy('startTime', 'desc'))
      : query(
          contractionsRef,
          where('archived', '==', false),
          orderBy('startTime', 'desc')
        );

    // Subscribe to changes
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contractions = snapshot.docs.map((doc) =>
          documentToContraction(doc)
        );
        callback(contractions);
      },
      (error) => {
        console.error('Error in Firestore subscription:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to Firestore:', error);
    throw error;
  }
};

/**
 * Unsubscribe from real-time updates
 */
export const unsubscribeFromContractions = (
  unsubscribe: Unsubscribe
): void => {
  if (unsubscribe) {
    unsubscribe();
  }
};

/**
 * Batch archive multiple contractions
 */
export const batchArchive = async (ids: string[]): Promise<void> => {
  try {
    const db = getFirebaseDb();
    const contractionsRef = getContractionsCollection();
    const batch = writeBatch(db);

    const now = Date.now();

    ids.forEach((id) => {
      const docRef = doc(contractionsRef, id);
      batch.update(docRef, {
        archived: true,
        updatedAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error batch archiving contractions in Firestore:', error);
    throw error;
  }
};

/**
 * Batch delete multiple contractions permanently
 * Use with caution - this is irreversible
 */
export const batchDelete = async (ids: string[]): Promise<void> => {
  try {
    const db = getFirebaseDb();
    const contractionsRef = getContractionsCollection();
    const batch = writeBatch(db);

    ids.forEach((id) => {
      const docRef = doc(contractionsRef, id);
      batch.delete(docRef);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error batch deleting contractions in Firestore:', error);
    throw error;
  }
};

/**
 * Get a share link for the current user
 */
export const getShareLink = (): string => {
  const userId = getUserId();
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#userId=${userId}`;
};

/**
 * Set the userId from a share link
 */
export const setUserIdFromShareLink = (userId: string): void => {
  setFirebaseUserId(userId);
};
