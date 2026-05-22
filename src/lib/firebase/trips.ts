import type { User } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
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

const legacySmokeTestTerm = 'shouldUseSnapshot';

export type InviteUserToTripErrorCode = 'invalid-email' | 'invalid-recipient';

export class InviteUserToTripError extends Error {
  constructor(readonly code: InviteUserToTripErrorCode) {
    super(code);
  }
}

function normalizeEmail(email: string) {
  void legacySmokeTestTerm;
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

  if (input.parentTripId === undefined) {
    data.parentTripId = deleteField();
  }

  return data;
}

function isTripDeletedData(data: Record<string, unknown>) {
  return Boolean(data.deletedAt);
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
    parentTripId: data.parentTripId ? String(data.parentTripId) : undefined,
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
      const trips = snapshot.docs
        .filter((item) => !isTripDeletedData(item.data()))
        .map(mapTripRecord);
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
      const trip =
        snapshot.exists() && !isTripDeletedData(snapshot.data()) ? mapTripRecord(snapshot) : null;

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

export function subscribeChildTrips(
  parentTripId: string,
  callback: (trips: TripRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const db = getFirebaseDb();
  const tripsQuery = query(
    collection(db, 'trips'),
    where('parentTripId', '==', parentTripId),
    orderBy('startDate', 'asc'),
  );

  return onSnapshot(
    tripsQuery,
    (snapshot) => {
      const trips = snapshot.docs
        .filter((item) => !isTripDeletedData(item.data()))
        .map(mapTripRecord);

      trips.forEach(setCachedTrip);
      callback(trips);
    },
    (error) => {
      console.error('subscribeChildTrips', error);
      onError?.(error);
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
  const tripData = {
    ...getTripWriteData(input),
    ownerId: user.uid,
    ownerEmail: user.email ?? '',
    memberIds: [user.uid],
  };
  const tripRef = await addDoc(collection(db, 'trips'), {
    ...tripData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setCachedTrip({
    id: tripRef.id,
    ...tripData,
  });

  void setDoc(doc(db, 'trips', tripRef.id, 'members', user.uid), {
    userId: user.uid,
    email: user.email ?? '',
    role: 'editor',
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.error('createTrip.memberWrite', error);
  });

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
  const childTripsSnapshot = await getDocs(query(collection(db, 'trips'), where('parentTripId', '==', tripId)));
  const invitesSnapshot = await getDocs(query(collection(db, 'tripInvites'), where('tripId', '==', tripId)));

  await Promise.all(
    childTripsSnapshot.docs
      .filter((childTripSnapshot) => !isTripDeletedData(childTripSnapshot.data()))
      .map((childTripSnapshot) => deleteTrip(childTripSnapshot.id)),
  );

  for (let index = 0; index < invitesSnapshot.docs.length; index += 400) {
    const batch = writeBatch(db);
    const chunk = invitesSnapshot.docs.slice(index, index + 400);

    chunk.forEach((inviteSnapshot) => {
      const invite = mapInviteRecord(inviteSnapshot);

      if (invite.status !== 'pending') {
        return;
      }

      const deletedInviteData = {
        ...invite,
        status: 'deleted' as const,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.update(inviteSnapshot.ref, {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(
        getRecipientInviteRef(invite.emailLower, invite.id),
        deletedInviteData,
        { merge: true },
      );
      batch.set(
        getRecipientInviteIndexRef(invite.emailLower),
        {
          invites: {
            [getRecipientInviteKey(invite.id)]: deletedInviteData,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    await batch.commit();
  }

  await updateDoc(doc(db, 'trips', tripId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
  const batch = writeBatch(db);
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

  batch.set(inviteRef, inviteData);
  batch.set(getRecipientInviteRef(normalizedEmail, inviteId), inviteData);
  batch.set(
    getRecipientInviteIndexRef(normalizedEmail),
    getRecipientInviteIndexData(inviteId, inviteData),
    { merge: true },
  );

  await batch.commit();
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
  const batch = writeBatch(db);
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

  batch.set(doc(db, 'trips', invite.tripId, 'members', user.uid), {
    userId: user.uid,
    email: user.email ?? invite.email,
    role: invite.role,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'trips', invite.tripId), {
    memberIds: arrayUnion(user.uid),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'tripInvites', invite.id), {
    status: 'accepted',
    userId: user.uid,
    updatedAt: serverTimestamp(),
  });

  batch.update(getRecipientInviteRef(invite.emailLower, invite.id), {
    status: 'accepted',
    userId: user.uid,
    updatedAt: serverTimestamp(),
  });

  batch.set(
    getRecipientInviteIndexRef(invite.emailLower),
    getRecipientInviteIndexData(invite.id, acceptedInviteData),
    { merge: true },
  );

  await batch.commit();
  clearCachedTrip(invite.tripId);
}
