import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

let firebaseDb: Firestore | null = null;

function shouldUseSafeFirestoreMode() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform ?? '';
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) || /iPad|iPhone|iPod/.test(platform);
  const isIpadOsDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
  const isAppleWebkit = /AppleWebKit\//.test(userAgent);

  return isAppleWebkit && (isIosDevice || isIpadOsDesktopMode);
}

export function getMissingFirebaseConfig() {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function isFirebaseConfigured() {
  return getMissingFirebaseConfig().length === 0;
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error(`Firebase config missing: ${getMissingFirebaseConfig().join(', ')}`);
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebasePublicConfig() {
  return { ...firebaseConfig };
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  if (firebaseDb) {
    return firebaseDb;
  }

  const app = getFirebaseApp();

  if (shouldUseSafeFirestoreMode()) {
    firebaseDb = getFirestore(app);
    return firebaseDb;
  }

  try {
    firebaseDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn('initializeFirestore.offlinePersistence', error);
    firebaseDb = getFirestore(app);
  }

  return firebaseDb;
}
