import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { ChecklistItemInput, ChecklistItemRecord } from '../app/models';
import { getFirebaseDb } from './config';

function getLuggageItemWriteData(input: ChecklistItemInput) {
  return {
    title: input.title.trim(),
    status: input.status,
  };
}

function mapLuggageItemRecord(snapshot: { id: string; data: () => Record<string, unknown> }): ChecklistItemRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: String(data.title ?? ''),
    status: data.status === 'completed' ? 'completed' : 'pending',
  };
}

export function subscribeTripLuggageItems(
  tripId: string,
  callback: (items: ChecklistItemRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const luggageRef = collection(db, 'trips', tripId, 'luggageItems');

  return onSnapshot(
    luggageRef,
    (snapshot) =>
      callback(
        snapshot.docs
          .map(mapLuggageItemRecord)
          .filter((item) => item.title)
          .sort((left, right) => {
            if (left.status !== right.status) {
              return left.status === 'pending' ? -1 : 1;
            }

            return left.title.localeCompare(right.title);
          }),
      ),
    (error) => {
      console.error('subscribeTripLuggageItems', error);
      onError?.(error);
    },
  );
}

export async function createTripLuggageItem(tripId: string, input: ChecklistItemInput) {
  const db = getFirebaseDb();
  const luggageItemRef = await addDoc(collection(db, 'trips', tripId, 'luggageItems'), {
    ...getLuggageItemWriteData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return luggageItemRef.id;
}

export async function updateTripLuggageItem(tripId: string, luggageItemId: string, input: ChecklistItemInput) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'luggageItems', luggageItemId), {
    ...getLuggageItemWriteData(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTripLuggageItem(tripId: string, luggageItemId: string) {
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'trips', tripId, 'luggageItems', luggageItemId));
}
