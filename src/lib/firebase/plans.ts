import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { PlanInput, PlanRecord } from '../app/models';
import { getFirebaseDb } from './config';

function mapPlanRecord(snapshot: { id: string; data: () => Record<string, unknown> }): PlanRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    category: (data.category as PlanRecord['category']) ?? 'visit',
    locationName: data.locationName ? String(data.locationName) : undefined,
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : undefined,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : undefined,
    date: data.date ? String(data.date) : undefined,
    time: data.time ? String(data.time) : undefined,
    status: (data.status as PlanRecord['status']) ?? 'pending',
  };
}

export function subscribeTripPlans(tripId: string, callback: (plans: PlanRecord[]) => void) {
  const db = getFirebaseDb();
  const plansRef = collection(db, 'trips', tripId, 'plans');

  return onSnapshot(
    plansRef,
    (snapshot) =>
      callback(
        snapshot.docs
          .map(mapPlanRecord)
          .sort((left, right) =>
            `${left.date ?? '9999-99-99'}${left.time ?? '99:99'}`.localeCompare(
              `${right.date ?? '9999-99-99'}${right.time ?? '99:99'}`,
            ),
          ),
      ),
    (error) => {
      console.error('subscribeTripPlans', error);
    },
  );
}

export function subscribePlan(
  tripId: string,
  planId: string,
  callback: (plan: PlanRecord | null) => void,
) {
  const db = getFirebaseDb();

  return onSnapshot(
    doc(db, 'trips', tripId, 'plans', planId),
    (snapshot) => callback(snapshot.exists() ? mapPlanRecord(snapshot) : null),
    (error) => {
      console.error('subscribePlan', error);
    },
  );
}

export async function createPlan(tripId: string, input: PlanInput) {
  const db = getFirebaseDb();
  const planRef = await addDoc(collection(db, 'trips', tripId, 'plans'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return planRef.id;
}

export async function updatePlan(tripId: string, planId: string, input: PlanInput) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'plans', planId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
