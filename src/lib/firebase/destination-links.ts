import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { DestinationLinkInput, DestinationLinkRecord } from '../app/models';
import {
  normalizeDestinationLinkInput,
  sortDestinationLinks,
  validateDestinationLink,
} from '../app/destination-links';
import { getFirebaseDb } from './config';

function getDestinationLinkWriteData(input: DestinationLinkInput) {
  const normalized = normalizeDestinationLinkInput(input);
  const validation = validateDestinationLink(normalized);

  if (!validation.valid) {
    throw new Error(validation.errorKey);
  }

  return {
    title: normalized.title,
    url: normalized.url,
    category: normalized.category ?? '',
    notes: normalized.notes ?? '',
  };
}

function mapDestinationLinkRecord(snapshot: { id: string; data: () => Record<string, unknown> }): DestinationLinkRecord | null {
  const data = snapshot.data();
  const normalized = normalizeDestinationLinkInput({
    title: String(data.title ?? ''),
    url: String(data.url ?? ''),
    category: data.category ? String(data.category) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
  });

  if (!normalized.title || !normalized.url) {
    return null;
  }

  return {
    id: snapshot.id,
    ...normalized,
  };
}

export function subscribeTripDestinationLinks(
  tripId: string,
  callback: (links: DestinationLinkRecord[]) => void,
) {
  const db = getFirebaseDb();
  const linksRef = collection(db, 'trips', tripId, 'destinationLinks');

  return onSnapshot(
    linksRef,
    (snapshot) =>
      callback(
        sortDestinationLinks(
          snapshot.docs
            .map(mapDestinationLinkRecord)
            .filter((link): link is DestinationLinkRecord => Boolean(link)),
        ),
      ),
    (error) => {
      console.error('subscribeTripDestinationLinks', error);
    },
  );
}

export async function createTripDestinationLink(tripId: string, input: DestinationLinkInput) {
  const db = getFirebaseDb();
  const linkRef = await addDoc(collection(db, 'trips', tripId, 'destinationLinks'), {
    ...getDestinationLinkWriteData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return linkRef.id;
}

export async function updateTripDestinationLink(
  tripId: string,
  linkId: string,
  input: DestinationLinkInput,
) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'destinationLinks', linkId), {
    ...getDestinationLinkWriteData(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTripDestinationLink(tripId: string, linkId: string) {
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'trips', tripId, 'destinationLinks', linkId));
}
