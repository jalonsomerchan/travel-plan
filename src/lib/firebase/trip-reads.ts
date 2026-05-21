import { doc, getDoc } from 'firebase/firestore';
import type { TripAccommodationRecord, TripRecord } from '../app/models';
import { getFirebaseDb } from './config';
import { clearCachedTrip, getCachedTrip, setCachedTrip } from './shared-data-cache';

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

function isTripDeletedData(data: Record<string, unknown>) {
  return Boolean(data.deletedAt);
}

export async function getTripOnce(tripId: string) {
  const cachedTrip = getCachedTrip(tripId);

  if (cachedTrip) {
    return cachedTrip;
  }

  const snapshot = await getDoc(doc(getFirebaseDb(), 'trips', tripId));

  if (!snapshot.exists()) {
    return null;
  }

  if (isTripDeletedData(snapshot.data())) {
    clearCachedTrip(tripId);
    return null;
  }

  const trip = mapTripRecord(snapshot);
  setCachedTrip(trip);

  return trip;
}
