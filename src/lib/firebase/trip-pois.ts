import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { TripPointOfInterestInput, TripPointOfInterestRecord } from '../app/models';
import { getFirebaseDb } from './config';

function getPoiWriteData(input: TripPointOfInterestInput) {
  return {
    name: input.name.trim(),
    icon: input.icon.trim(),
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
    icon: String(data.icon ?? 'pin'),
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
