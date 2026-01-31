import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
 * Get or initialize Firestore instance with offline persistence
 * Uses the modern cache configuration (not deprecated APIs)
 */
export const getFirebaseDb = (): Firestore => {
  if (!db) {
    const firebaseApp = getFirebaseApp();

    // Initialize Firestore with persistent cache and multi-tab support
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });

    console.log('Firestore initialized with multi-tab persistent cache');
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
