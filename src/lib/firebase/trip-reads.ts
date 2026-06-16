import { doc, getDoc } from 'firebase/firestore';
import { normalizeDestinationLinks } from '../app/destination-links';
import type { TripAccommodationRecord, TripChildSummaryRecord, TripRecord } from '../app/models';
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

function mapTripChildSummaryRecord(value: unknown): TripChildSummaryRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const id = String(data.id ?? '').trim();
  const name = String(data.name ?? '').trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    location: String(data.location ?? ''),
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    status: (data.status as TripRecord['status']) ?? 'idea',
  };
}

function mapTripChildSummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const childTrip = mapTripChildSummaryRecord(item);

    return childTrip ? [childTrip] : [];
  });
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
    childTrips: mapTripChildSummaries(data.childTrips),
    destinationLinks: normalizeDestinationLinks(data.destinationLinks),
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
