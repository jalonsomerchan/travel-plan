import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { TripPointOfInterestInput, TripPointOfInterestRecord } from '../app/models';
import {
  getTripPoiDefaultIcon,
  normalizeTripPoiColor,
  normalizeTripPoiType,
} from '../app/trip-pois';
import { getFirebaseDb } from './config';

function getPoiWriteData(input: TripPointOfInterestInput) {
  const type = normalizeTripPoiType(input.type);

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    icon: input.icon.trim() || getTripPoiDefaultIcon(type),
    type,
    color: normalizeTripPoiColor(input.color, type),
    isVisible: input.isVisible,
    locationName: input.locationName.trim(),
    locationLat: input.locationLat,
    locationLng: input.locationLng,
  };
}

function mapPoiRecord(snapshot: { id: string; data: () => Record<string, unknown> }): TripPointOfInterestRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    icon: String(data.icon ?? 'pin'),
    type: normalizeTripPoiType(typeof data.type === 'string' ? data.type : undefined),
    color: normalizeTripPoiColor(typeof data.color === 'string' ? data.color : undefined, String(data.type ?? '')),
    isVisible: data.isVisible !== false,
    locationName: String(data.locationName ?? ''),
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : Number.NaN,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : Number.NaN,
  };
}

export function subscribeTripPointsOfInterest(
  tripId: string,
  callback: (points: TripPointOfInterestRecord[]) => void,
) {
  const db = getFirebaseDb();
  const poisRef = collection(db, 'trips', tripId, 'pointsOfInterest');

  return onSnapshot(
    poisRef,
    (snapshot) =>
      callback(
        snapshot.docs
          .map(mapPoiRecord)
          .filter((point) => point.name && Number.isFinite(point.locationLat) && Number.isFinite(point.locationLng))
          .sort((left, right) => left.name.localeCompare(right.name)),
      ),
    (error) => {
      console.error('subscribeTripPointsOfInterest', error);
    },
  );
}

export async function createTripPointOfInterest(tripId: string, input: TripPointOfInterestInput) {
  const db = getFirebaseDb();
  const poiRef = await addDoc(collection(db, 'trips', tripId, 'pointsOfInterest'), {
    ...getPoiWriteData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return poiRef.id;
}

function reportQueuedPoiWrite(error: unknown) {
  console.error('queuedPoiWrite', error);
}

export function queueCreateTripPointOfInterest(tripId: string, input: TripPointOfInterestInput) {
  const db = getFirebaseDb();
  const poiRef = doc(collection(db, 'trips', tripId, 'pointsOfInterest'));

  void setDoc(poiRef, {
    ...getPoiWriteData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(reportQueuedPoiWrite);

  return poiRef.id;
}

export async function updateTripPointOfInterest(
  tripId: string,
  pointId: string,
  input: TripPointOfInterestInput,
) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'pointsOfInterest', pointId), {
    ...getPoiWriteData(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTripPointOfInterest(tripId: string, pointId: string) {
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'trips', tripId, 'pointsOfInterest', pointId));
}
