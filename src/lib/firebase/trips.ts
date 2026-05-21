import type { User } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getInviteId,
  isValidInviteEmail,
  normalizeInviteEmail,
} from '../app/invite-share';
import type {
  TripAccommodationRecord,
  TripInput,
  TripInviteRecord,
  TripMemberRecord,
  TripMemberRole,
  TripRecord,
} from '../app/models';
import { getFirebaseDb } from './config';
import { clearCachedTrip, clearTripSharedCache, getCachedTrip, setCachedTrip } from './shared-data-cache';

export type InviteUserToTripErrorCode = 'invalid-email' | 'invalid-recipient';

export class InviteUserToTripError extends Error {
  constructor(readonly code: InviteUserToTripErrorCode) {
    super(code);
  }
}

function normalizeEmail(email: string) {
  return normalizeInviteEmail(email);
}

function isValidEmail(email: string) {
  return isValidInviteEmail(email);
}

function getRecipientInviteKey(inviteId: string) {
  return encodeURIComponent(inviteId);
}

function getRecipientInviteRef(emailLower: string, inviteId: string) {
  return doc(getFirebaseDb(), 'userInvites', emailLower, 'invites', inviteId);
}

function getRecipientInviteIndexRef(emailLower: string) {
  return doc(getFirebaseDb(), 'userInvites', emailLower);
}

function mapTripAccommodationRecord(value: unknown): TripAccommodationRecord | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const data = value as Record<string, unknown>;
  const name = String(data.name ?? '').trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    locationName: data.locationName ? String(data.locationName) : undefined,
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : undefined,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : undefined,
  };
}

function getTripWriteData(input: TripInput) {
  return {
    ...input,
    accommodation: input.accommodation ?? null,
  };
}

function getTripUpdateData(input: TripInput) {
  const data: Record<string, unknown> = {
    ...getTripWriteData(input),
  };

  if (input.locationLat === undefined) {
    data.locationLat = deleteField();
  }

  if (input.locationLng === undefined) {
    data.locationLng = deleteField();
  }

  return data;
}

function mapTripRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    location: String(data.location ?? ''),
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : undefined,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : undefined,
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    status: (data.status as TripRecord['status']) ?? 'idea',
    accommodation: mapTripAccommodationRecord(data.accommodation),
    ownerId: String(data.ownerId ?? ''),
    ownerEmail: String(data.ownerEmail ?? ''),
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
  };
}

function mapMemberRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripMemberRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId ? String(data.userId) : undefined,
    email: String(data.email ?? ''),
    role: (data.role as TripMemberRole) ?? 'viewer',
  };
}

function mapInviteData(id: string, data: Record<string, unknown>): TripInviteRecord {
  return {
    id,
    tripId: String(data.tripId ?? ''),
    tripName: String(data.tripName ?? ''),
    tripLocation: String(data.tripLocation ?? ''),
    tripStartDate: String(data.tripStartDate ?? ''),
    tripEndDate: String(data.tripEndDate ?? ''),
    ownerId: String(data.ownerId ?? ''),
    ownerEmail: String(data.ownerEmail ?? ''),
    email: String(data.email ?? ''),
    emailLower: String(data.emailLower ?? ''),
    role: (data.role as TripMemberRole) ?? 'viewer',
    status: (data.status as TripInviteRecord['status']) ?? 'pending',
  };
}

function mapInviteRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripInviteRecord {
  return mapInviteData(snapshot.id, snapshot.data());
}

function getRecipientInviteIndexData(inviteId: string, inviteData: Record<string, unknown>) {
  return {
    emailLower: inviteData.emailLower,
    invites: {
      [getRecipientInviteKey(inviteId)]: {
        ...inviteData,
        id: inviteId,
      },
    },
    updatedAt: serverTimestamp(),
  };
}

async function deleteSnapshotsInBatches(
  snapshots: Array<{ ref: unknown }>,
  extendBatch?: (batch: ReturnType<typeof writeBatch>, chunk: Array<{ ref: unknown }>) => void,
) {
  if (snapshots.length === 0) {
    return;
  }

  const db = getFirebaseDb();

  for (let index = 0; index < snapshots.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = snapshots.slice(index, index + 400);

    chunk.forEach((snapshot) => {
      batch.delete(snapshot.ref as Parameters<typeof batch.delete>[0]);
    });

    extendBatch?.(batch, chunk);
    await batch.commit();
  }
}

function mapRecipientInviteIndex(data: Record<string, unknown>) {
  const invites = data.invites;

  if (!invites || typeof invites !== 'object') {
    return [];
  }

  return Object.values(invites as Record<string, Record<string, unknown>>)
    .map((invite) => mapInviteData(String(invite.id ?? ''), invite))
    .filter((invite) => invite.id && invite.status === 'pending');
}

export function subscribeUserTrips(
  userId: string,
  callback: (trips: TripRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const tripsQuery = query(
    collection(db, 'trips'),
    where('memberIds', 'array-contains', userId),
    orderBy('startDate', 'asc'),
  );

  return onSnapshot(
    tripsQuery,
    (snapshot) => {
      const trips = snapshot.docs.map(mapTripRecord);
      trips.forEach(setCachedTrip);
      callback(trips);
    },
    (error) => {
      console.error('subscribeUserTrips', error);
      onError?.(error);
    },
  );
}

export function subscribeTrip(tripId: string, callback: (trip: TripRecord | null) => void) {
  const db = getFirebaseDb();
  const tripRef = doc(db, 'trips', tripId);
  const cachedTrip = getCachedTrip(tripId);

  if (cachedTrip) {
    queueMicrotask(() => callback(cachedTrip));
  }

  return onSnapshot(
    tripRef,
    (snapshot) => {
      const trip = snapshot.exists() ? mapTripRecord(snapshot) : null;

      if (trip) {
        setCachedTrip(trip);
      } else {
        clearCachedTrip(tripId);
      }

      callback(trip);
    },
    (error) => {
      console.error('subscribeTrip', error);
    },
  );
}

export function subscribeTripMembers(tripId: string, callback: (members: TripMemberRecord[]) => void) {
  const db = getFirebaseDb();
  const membersQuery = query(collection(db, 'trips', tripId, 'members'), orderBy('email', 'asc'));

  return onSnapshot(
    membersQuery,
    (snapshot) => callback(snapshot.docs.map(mapMemberRecord)),
    (error) => {
      console.error('subscribeTripMembers', error);
    },
  );
}

export function subscribeTripInvites(
  tripId: string,
  ownerId: string,
  callback: (invites: TripInviteRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const invitesQuery = query(
    collection(db, 'tripInvites'),
    where('tripId', '==', tripId),
    where('ownerId', '==', ownerId),
    where('status', '==', 'pending'),
  );

  return onSnapshot(
    invitesQuery,
    (snapshot) => callback(snapshot.docs.map(mapInviteRecord)),
    (error) => {
      console.error('subscribeTripInvites', error);
      onError?.(error);
    },
  );
}

export async function createTrip(user: User, input: TripInput) {
  const db = getFirebaseDb();
  const tripRef = await addDoc(collection(db, 'trips'), {
    ...getTripWriteData(input),
    ownerId: user.uid,
    ownerEmail: user.email ?? '',
    memberIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'trips', tripRef.id, 'members', user.uid), {
    userId: user.uid,
    email: user.email ?? '',
    role: 'editor',
    createdAt: serverTimestamp(),
  });

  clearCachedTrip(tripRef.id);

  return tripRef.id;
}

export async function updateTrip(tripId: string, input: TripInput) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId), {
    ...getTripUpdateData(input),
    updatedAt: serverTimestamp(),
  });
  clearCachedTrip(tripId);
}

export async function deleteTrip(tripId: string) {
  const db = getFirebaseDb();
  const snapshots = await Promise.all([
    getDocs(collection(db, 'trips', tripId, 'plans')),
    getDocs(collection(db, 'trips', tripId, 'checklistItems')),
    getDocs(collection(db, 'trips', tripId, 'luggageItems')),
    getDocs(collection(db, 'trips', tripId, 'pointsOfInterest')),
    getDocs(collection(db, 'trips', tripId, 'members')),
  ]);
  const invitesSnapshot = await getDocs(query(collection(db, 'tripInvites'), where('tripId', '==', tripId)));

  for (const snapshot of snapshots) {
    await deleteSnapshotsInBatches(snapshot.docs);
  }

  await deleteSnapshotsInBatches(invitesSnapshot.docs, (batch, chunk) => {
    chunk.forEach((inviteSnapshot) => {
      const invite = mapInviteRecord(inviteSnapshot);

      batch.delete(getRecipientInviteRef(invite.emailLower, invite.id));
      batch.set(
        getRecipientInviteIndexRef(invite.emailLower),
        {
          invites: {
            [getRecipientInviteKey(invite.id)]: deleteField(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  });

  await deleteDoc(doc(db, 'trips', tripId));
  clearTripSharedCache(tripId);
}

export async function inviteUserToTrip(
  user: User,
  tripId: string,
  tripName: string,
  tripLocation: string,
  tripStartDate: string,
  tripEndDate: string,
  email: string,
  role: TripMemberRole,
) {
  const db = getFirebaseDb();
  const cleanEmail = email.trim();
  const normalizedEmail = normalizeEmail(email);
  const ownerEmail = normalizeEmail(user.email ?? '');

  if (!isValidEmail(normalizedEmail)) {
    throw new InviteUserToTripError('invalid-email');
  }

  if (ownerEmail && normalizedEmail === ownerEmail) {
    throw new InviteUserToTripError('invalid-recipient');
  }

  const inviteId = getInviteId(tripId, normalizedEmail);
  const inviteRef = doc(db, 'tripInvites', inviteId);
  const inviteData = {
    tripId,
    tripName,
    tripLocation,
    tripStartDate,
    tripEndDate,
    ownerId: user.uid,
    ownerEmail: user.email ?? '',
    email: cleanEmail,
    emailLower: normalizedEmail,
    role,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(inviteRef, inviteData);
  await setDoc(getRecipientInviteRef(normalizedEmail, inviteId), inviteData);
  await setDoc(getRecipientInviteIndexRef(normalizedEmail), getRecipientInviteIndexData(inviteId, inviteData), {
    merge: true,
  });
}

export function subscribePendingInvites(
  email: string,
  callback: (invites: TripInviteRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const normalizedEmail = normalizeEmail(email);
  const inviteIndexRef = getRecipientInviteIndexRef(normalizedEmail);

  return onSnapshot(
    inviteIndexRef,
    (snapshot) => callback(snapshot.exists() ? mapRecipientInviteIndex(snapshot.data()) : []),
    (error) => {
      console.error('subscribePendingInvites', error);
      onError?.(error);
    },
  );
}

export async function acceptInvite(user: User, invite: TripInviteRecord) {
  const db = getFirebaseDb();
  const userEmail = normalizeEmail(user.email ?? '');

  if (!userEmail || userEmail !== invite.emailLower) {
    throw new InviteUserToTripError('invalid-recipient');
  }

  const acceptedInviteData = {
    ...invite,
    status: 'accepted',
    userId: user.uid,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'trips', invite.tripId, 'members', user.uid), {
    userId: user.uid,
    email: user.email ?? invite.email,
    role: invite.role,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'trips', invite.tripId), {
    memberIds: arrayUnion(user.uid),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'tripInvites', invite.id), {
    status: 'accepted',
    userId: user.uid,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(getRecipientInviteRef(invite.emailLower, invite.id), {
    status: 'accepted',
    userId: user.uid,
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    getRecipientInviteIndexRef(invite.emailLower),
    getRecipientInviteIndexData(invite.id, acceptedInviteData),
    { merge: true },
  );
  clearCachedTrip(invite.tripId);
}
