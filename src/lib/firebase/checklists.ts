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

function getChecklistItemWriteData(input: ChecklistItemInput) {
  return {
    title: input.title.trim(),
    status: input.status,
  };
}

function mapChecklistItemRecord(snapshot: { id: string; data: () => Record<string, unknown> }): ChecklistItemRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: String(data.title ?? ''),
    status: data.status === 'completed' ? 'completed' : 'pending',
  };
}

export function subscribeTripChecklistItems(
  tripId: string,
  callback: (items: ChecklistItemRecord[]) => void,
) {
  const db = getFirebaseDb();
  const checklistRef = collection(db, 'trips', tripId, 'checklistItems');

  return onSnapshot(
    checklistRef,
    (snapshot) =>
      callback(
        snapshot.docs
          .map(mapChecklistItemRecord)
          .filter((item) => item.title)
          .sort((left, right) => {
            if (left.status !== right.status) {
              return left.status === 'pending' ? -1 : 1;
            }

            return left.title.localeCompare(right.title);
          }),
      ),
    (error) => {
      console.error('subscribeTripChecklistItems', error);
    },
  );
}

export async function createTripChecklistItem(tripId: string, input: ChecklistItemInput) {
  const db = getFirebaseDb();
  const checklistItemRef = await addDoc(collection(db, 'trips', tripId, 'checklistItems'), {
    ...getChecklistItemWriteData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return checklistItemRef.id;
}

export async function updateTripChecklistItem(
  tripId: string,
  checklistItemId: string,
  input: ChecklistItemInput,
) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'checklistItems', checklistItemId), {
    ...getChecklistItemWriteData(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTripChecklistItem(tripId: string, checklistItemId: string) {
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'trips', tripId, 'checklistItems', checklistItemId));
}
