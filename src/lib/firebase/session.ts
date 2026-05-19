import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './config';

async function syncUserProfile(user: User) {
  const db = getFirebaseDb();
  const profileRef = doc(db, 'users', user.uid);

  await setDoc(
    profileRef,
    {
      uid: user.uid,
      email: user.email ?? '',
      emailLower: (user.email ?? '').toLowerCase(),
      displayName: user.displayName ?? '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function trySyncUserProfile(user: User) {
  try {
    await syncUserProfile(user);
  } catch (error) {
    console.warn('syncUserProfile', error);
  }
}

export function observeSession(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await trySyncUserProfile(user);
    }

    callback(user);
  });
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  const credential = await signInWithPopup(auth, provider);

  await trySyncUserProfile(credential.user);

  return credential.user;
}

export function signOutSession() {
  return signOut(getFirebaseAuth());
}
