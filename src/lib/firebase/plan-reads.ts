import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { PlanRecord } from '../app/models';
import { normalizePlanLinks } from '../app/plan-links';
import { getFirebaseDb } from './config';
import { getCachedTripPlans, setCachedTripPlans } from './shared-data-cache';

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

export async function getTripPlansOnce(tripId: string) {
  const cachedPlans = getCachedTripPlans(tripId);

  if (cachedPlans) {
    return cachedPlans;
  }

  const snapshot = await getDocs(collection(getFirebaseDb(), 'trips', tripId, 'plans'));
  const plans = sortPlans(snapshot.docs.map(mapPlanRecord));
  setCachedTripPlans(tripId, plans);

  return plans;
}

export async function getPlanOnce(tripId: string, planId: string) {
  const cachedPlan = getCachedTripPlans(tripId)?.find((plan) => plan.id === planId) ?? null;

  if (cachedPlan) {
    return cachedPlan;
  }

  const snapshot = await getDoc(doc(getFirebaseDb(), 'trips', tripId, 'plans', planId));

  return snapshot.exists() ? mapPlanRecord(snapshot) : null;
}
