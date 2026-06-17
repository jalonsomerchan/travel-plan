import { collection, getDocs } from 'firebase/firestore';
import { defaultTripPoiType, tripPoiTypeValues } from '../../config/trip-pois';
import type { ChecklistItemRecord, TripPoiRecord } from '../app/models';
import { getFirebaseDb } from './config';

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function normalizePoiType(value: unknown): TripPoiRecord['type'] {
  return tripPoiTypeValues.includes(value as TripPoiRecord['type']) ? (value as TripPoiRecord['type']) : defaultTripPoiType;
}

function mapChecklistItemRecord(snapshot: { id: string; data: () => Record<string, unknown> }): ChecklistItemRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: getString(data.title),
    status: data.status === 'completed' ? 'completed' : 'pending',
  };
}

function mapTripPoiRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripPoiRecord {
  const data = snapshot.data();
  const type = normalizePoiType(data.type);

  return {
    id: snapshot.id,
    name: getString(data.name),
    description: getString(data.description),
    type,
    icon: getString(data.icon) || 'pin',
    color: getString(data.color),
    locationName: getString(data.locationName),
    locationLat: getFiniteNumber(data.locationLat),
    locationLng: getFiniteNumber(data.locationLng),
    isVisible: data.isVisible !== false,
    isSystem: data.isSystem === true,
  };
}

export async function getTripChecklistItemsOnce(tripId: string) {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'trips', tripId, 'checklistItems'));

  return snapshot.docs
    .map(mapChecklistItemRecord)
    .filter((item) => item.title)
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'pending' ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function getTripPoisOnce(tripId: string) {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'trips', tripId, 'pointsOfInterest'));

  return snapshot.docs
    .map(mapTripPoiRecord)
    .filter((point) => point.name && Number.isFinite(point.locationLat) && Number.isFinite(point.locationLng))
    .sort((left, right) => left.name.localeCompare(right.name));
}
