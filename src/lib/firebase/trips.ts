import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type User,
} from 'firebase/firestore';
import type {
  TripAccommodationRecord,
  TripInput,
  TripInviteRecord,
  TripMemberRecord,
  TripMemberRole,
  TripRecord,
} from '../app/models';
import { getFirebaseDb } from './config';

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

function mapTripRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    location: String(data.location ?? ''),
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

function mapInviteRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripInviteRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
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

export function subscribeUserTrips(userId: string, callback: (trips: TripRecord[]) => void) {
  const db = getFirebaseDb();
  const tripsQuery = query(
    collection(db, 'trips'),
    where('memberIds', 'array-contains', userId),
    orderBy('startDate', 'asc'),
  );

  return onSnapshot(
    tripsQuery,
    (snapshot) => callback(snapshot.docs.map(mapTripRecord)),
    (error) => {
      console.error('subscribeUserTrips', error);
    },
  );
}

export function subscribeTrip(tripId: string, callback: (trip: TripRecord | null) => void) {
  const db = getFirebaseDb();
  const tripRef = doc(db, 'trips', tripId);

  return onSnapshot(
    tripRef,
    (snapshot) => callback(snapshot.exists() ? mapTripRecord(snapshot) : null),
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

  return tripRef.id;
}

export async function updateTrip(tripId: string, input: TripInput) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId), {
    ...getTripWriteData(input),
    updatedAt: serverTimestamp(),
  });
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
  const normalizedEmail = email.trim().toLowerCase();
  const usersQuery = query(collection(db, 'users'), where('emailLower', '==', normalizedEmail));
  const usersSnapshot = await getDocs(usersQuery);

  await addDoc(collection(db, 'tripInvites'), {
    tripId,
    tripName,
    tripLocation,
    tripStartDate,
    tripEndDate,
    ownerId: user.uid,
    ownerEmail: user.email ?? '',
    email: email.trim(),
    emailLower: normalizedEmail,
    role,
    status: 'pending',
    userId: usersSnapshot.docs[0]?.id ?? null,
    createdAt: serverTimestamp(),
  });
}

export function subscribePendingInvites(email: string, callback: (invites: TripInviteRecord[]) => void) {
  const db = getFirebaseDb();
  const invitesQuery = query(
    collection(db, 'tripInvites'),
    where('emailLower', '==', email.toLowerCase()),
    where('status', '==', 'pending'),
  );

  return onSnapshot(
    invitesQuery,
    (snapshot) => callback(snapshot.docs.map(mapInviteRecord)),
    (error) => {
      console.error('subscribePendingInvites', error);
    },
  );
}

export async function acceptInvite(user: User, invite: TripInviteRecord) {
  const db = getFirebaseDb();

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
}
