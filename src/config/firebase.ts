import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
import { getAuth, Auth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

// Validate Firebase config
const isFirebaseConfigured = (): boolean => {
  // Check if the placeholder values have been replaced
  const hasPlaceholders =
    firebaseConfig.apiKey?.includes('YOUR_') ||
    firebaseConfig.projectId?.includes('YOUR_');

  const hasAllValues = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );

  return hasAllValues && !hasPlaceholders;
};

// Initialize Firebase (lazy initialization)
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let persistenceEnabled = false;

/**
 * Get or initialize Firebase app
 */
export const getFirebaseApp = (): FirebaseApp => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Please update src/config/firebaseConfig.ts with your Firebase credentials.'
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
  }

  return app;
};

/**
 * Get or initialize Firestore instance
 */
export const getFirebaseDb = (): Firestore => {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    db = getFirestore(firebaseApp);

    // Enable offline persistence (only once)
    if (!persistenceEnabled) {
      enableOfflinePersistence().catch((error) => {
        console.warn('Failed to enable Firestore offline persistence:', error);
      });
    }
  }

  return db;
};

/**
 * Get or initialize Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    auth = getAuth(firebaseApp);
  }

  return auth;
};

/**
 * Enable offline persistence for Firestore
 * Uses multi-tab persistence if available, falls back to single-tab
 */
const enableOfflinePersistence = async (): Promise<void> => {
  if (persistenceEnabled || !db) return;

  try {
    // Try multi-tab persistence first
    await enableMultiTabIndexedDbPersistence(db);
    persistenceEnabled = true;
    console.log('Firestore multi-tab offline persistence enabled');
  } catch (error: any) {
    if (error?.code === 'failed-precondition') {
      // Multiple tabs open, fallback to single-tab
      console.warn('Multiple tabs open, using single-tab persistence');
      try {
        await enableIndexedDbPersistence(db);
        persistenceEnabled = true;
        console.log('Firestore single-tab offline persistence enabled');
      } catch (err) {
        console.error('Failed to enable single-tab persistence:', err);
      }
    } else if (error?.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Browser does not support offline persistence');
    } else {
      console.error('Unexpected error enabling persistence:', error);
    }
  }
};

/**
 * Initialize Firebase authentication
 * Signs in anonymously for link-sharing functionality
 */
export const initializeAuth = async (): Promise<void> => {
  const firebaseAuth = getFirebaseAuth();

  // Check if already signed in
  if (firebaseAuth.currentUser) {
    console.log('Already authenticated:', firebaseAuth.currentUser.uid);
    return;
  }

  // Sign in anonymously
  try {
    const userCredential = await signInAnonymously(firebaseAuth);
    console.log('Signed in anonymously:', userCredential.user.uid);
  } catch (error) {
    console.error('Failed to sign in anonymously:', error);
    throw error;
  }
};

/**
 * Check if Firebase is properly configured
 */
export const checkFirebaseConfig = (): boolean => {
  return isFirebaseConfigured();
};

// Export instances for direct use (will be null until first access)
export { app, db, auth };
