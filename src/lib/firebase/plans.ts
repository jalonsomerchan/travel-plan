import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { PlanInput, PlanRecord } from '../app/models';
import { normalizePlanLinks } from '../app/plan-links';
import { getFirebaseDb } from './config';
import {
  clearCachedTripPlans,
  getCachedTripPlans,
  setCachedTripPlans,
} from './shared-data-cache';
import { shouldUseSnapshot } from './snapshot-freshness';

const optionalPlanFields = ['locationName', 'locationLat', 'locationLng', 'date', 'time', 'aiGuide'] as const;

function getPlanCreateData(input: PlanInput) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function getPlanUpdateData(input: PlanInput) {
  const data: Record<string, unknown> = { ...input };

  optionalPlanFields.forEach((field) => {
    if (input[field] === undefined) {
      data[field] = deleteField();
    }
  });

  return data;
}

function mapPlanRecord(snapshot: { id: string; data: () => Record<string, unknown> }): PlanRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    category: (data.category as PlanRecord['category']) ?? 'visit',
    isPaid: data.isPaid === true,
    isBooked: data.isBooked === true,
    needsReservation: data.needsReservation === true,
    isOptional: data.isOptional === true,
    isImportant: data.isImportant === true,
    locationName: data.locationName ? String(data.locationName) : undefined,
    locationLat: typeof data.locationLat === 'number' ? data.locationLat : undefined,
    locationLng: typeof data.locationLng === 'number' ? data.locationLng : undefined,
    date: data.date ? String(data.date) : undefined,
    time: data.time ? String(data.time) : undefined,
    status: (data.status as PlanRecord['status']) ?? 'pending',
    links: normalizePlanLinks(data.links),
    aiGuide: data.aiGuide ? String(data.aiGuide) : undefined,
  };
}

function sortPlans(plans: PlanRecord[]) {
  return [...plans].sort((left, right) =>
    `${left.date ?? '9999-99-99'}${left.time ?? '99:99'}`.localeCompare(
      `${right.date ?? '9999-99-99'}${right.time ?? '99:99'}`,
    ),
  );
}

function inputToPlanRecord(id: string, input: PlanInput): PlanRecord {
  return {
    id,
    name: input.name,
    description: input.description,
    category: input.category,
    isPaid: input.isPaid,
    isBooked: input.isBooked,
    needsReservation: input.needsReservation,
    isOptional: input.isOptional,
    isImportant: input.isImportant,
    locationName: input.locationName,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    date: input.date,
    time: input.time,
    status: input.status,
    links: normalizePlanLinks(input.links),
    aiGuide: input.aiGuide,
  };
}

function upsertCachedPlan(tripId: string, plan: PlanRecord) {
  const cachedPlans = getCachedTripPlans(tripId);

  if (!cachedPlans) {
    return;
  }

  const nextPlans = cachedPlans.some((cachedPlan) => cachedPlan.id === plan.id)
    ? cachedPlans.map((cachedPlan) => (cachedPlan.id === plan.id ? plan : cachedPlan))
    : [...cachedPlans, plan];

  setCachedTripPlans(tripId, sortPlans(nextPlans));
}

function reportQueuedPlanWrite(error: unknown) {
  console.error('queuedPlanWrite', error);
}

export function subscribeTripPlans(tripId: string, callback: (plans: PlanRecord[]) => void) {
  const db = getFirebaseDb();
  const plansRef = collection(db, 'trips', tripId, 'plans');
  const cachedPlans = getCachedTripPlans(tripId);

  if (cachedPlans) {
    queueMicrotask(() => callback(cachedPlans));
  }

  return onSnapshot(
    plansRef,
    (snapshot) => {
      if (!shouldUseSnapshot(snapshot)) {
        return;
      }

      const plans = sortPlans(snapshot.docs.map(mapPlanRecord));
      setCachedTripPlans(tripId, plans);
      callback(plans);
    },
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
  const cachedPlans = getCachedTripPlans(tripId);
  const cachedPlan = cachedPlans?.find((plan) => plan.id === planId) ?? null;

  if (cachedPlan) {
    queueMicrotask(() => callback(cachedPlan));
  }

  const db = getFirebaseDb();

  return onSnapshot(
    doc(db, 'trips', tripId, 'plans', planId),
    (snapshot) => {
      if (!shouldUseSnapshot(snapshot)) {
        return;
      }

      callback(snapshot.exists() ? mapPlanRecord(snapshot) : null);
    },
    (error) => {
      console.error('subscribePlan', error);
    },
  );
}

export async function createPlan(tripId: string, input: PlanInput) {
  const db = getFirebaseDb();
  const planRef = await addDoc(collection(db, 'trips', tripId, 'plans'), {
    ...getPlanCreateData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  clearCachedTripPlans(tripId);

  return planRef.id;
}

export function queueCreatePlan(tripId: string, input: PlanInput) {
  const db = getFirebaseDb();
  const planRef = doc(collection(db, 'trips', tripId, 'plans'));

  upsertCachedPlan(tripId, inputToPlanRecord(planRef.id, input));
  void setDoc(planRef, {
    ...getPlanCreateData(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(reportQueuedPlanWrite);

  return planRef.id;
}

export async function updatePlan(tripId: string, planId: string, input: PlanInput) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'trips', tripId, 'plans', planId), {
    ...getPlanUpdateData(input),
    updatedAt: serverTimestamp(),
  });
  clearCachedTripPlans(tripId);
}

export function queueUpdatePlan(tripId: string, planId: string, input: PlanInput) {
  const db = getFirebaseDb();

  upsertCachedPlan(tripId, inputToPlanRecord(planId, input));
  void updateDoc(doc(db, 'trips', tripId, 'plans', planId), {
    ...getPlanUpdateData(input),
    updatedAt: serverTimestamp(),
  }).catch(reportQueuedPlanWrite);
}

export async function deletePlan(tripId: string, planId: string) {
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'trips', tripId, 'plans', planId));
  clearCachedTripPlans(tripId);
}
