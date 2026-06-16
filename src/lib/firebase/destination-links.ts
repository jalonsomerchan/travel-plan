import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  normalizeDestinationLinkInput,
  normalizeDestinationLinks,
  sortDestinationLinks,
  validateDestinationLink,
} from '../app/destination-links';
import type { DestinationLinkInput, DestinationLinkRecord } from '../app/models';
import { getFirebaseDb } from './config';

function createDestinationLinkId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `destination-link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

async function getTripDestinationLinks(tripId: string) {
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, 'trips', tripId));

  return normalizeDestinationLinks(snapshot.exists() ? snapshot.data().destinationLinks : undefined);
}

async function saveTripDestinationLinks(tripId: string, links: DestinationLinkRecord[]) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId), {
    destinationLinks: links.map((link) => ({
      id: link.id,
      ...getDestinationLinkWriteData(link),
    })),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeTripDestinationLinks(
  tripId: string,
  callback: (links: DestinationLinkRecord[]) => void,
) {
  const db = getFirebaseDb();

  return onSnapshot(
    doc(db, 'trips', tripId),
    (snapshot) => callback(normalizeDestinationLinks(snapshot.exists() ? snapshot.data().destinationLinks : undefined)),
    (error) => {
      console.error('subscribeTripDestinationLinks', error);
    },
  );
}

export async function createTripDestinationLink(tripId: string, input: DestinationLinkInput) {
  const links = await getTripDestinationLinks(tripId);
  const link: DestinationLinkRecord = {
    id: createDestinationLinkId(),
    ...getDestinationLinkWriteData(input),
  };

  await saveTripDestinationLinks(tripId, sortDestinationLinks([...links, link]));

  return link.id;
}

export async function updateTripDestinationLink(
  tripId: string,
  linkId: string,
  input: DestinationLinkInput,
) {
  const links = await getTripDestinationLinks(tripId);

  await saveTripDestinationLinks(
    tripId,
    links.map((link) => (link.id === linkId ? { id: linkId, ...getDestinationLinkWriteData(input) } : link)),
  );
}

export async function deleteTripDestinationLink(tripId: string, linkId: string) {
  const links = await getTripDestinationLinks(tripId);

  await saveTripDestinationLinks(
    tripId,
    links.filter((link) => link.id !== linkId),
  );
}
