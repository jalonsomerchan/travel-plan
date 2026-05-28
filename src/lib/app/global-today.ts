import { getDistanceBetweenCoordinates, type Coordinates } from './coordinates';
import type { PlanRecord, TripRecord } from './models';
import { hasPlanLocation } from './plan-location';

export interface TodayUserLocation extends Coordinates {
  accuracyMeters?: number;
}

export type TodayLocationStatus =
  | 'idle'
  | 'locating'
  | 'ready'
  | 'imprecise'
  | 'unsupported'
  | 'denied'
  | 'timeout'
  | 'unavailable';

export interface TodayLocationState {
  status: TodayLocationStatus;
  location: TodayUserLocation | null;
}

export interface TodayFilters {
  search: string;
  tripId: string;
  category: string;
  status: 'pending' | 'proposed' | 'all-open';
  maxDistanceKm: string;
  date: string;
  includeWithoutDate: boolean;
}

export interface TodayPlanItem {
  plan: PlanRecord;
  trip: TripRecord;
  distanceKm?: number;
}

export interface TodayDataState {
  tripsLoaded: boolean;
  loadingTripIds: string[];
}

export const defaultTodayFilters: TodayFilters = {
  search: '',
  tripId: 'all',
  category: 'all',
  status: 'pending',
  maxDistanceKm: 'all',
  date: '',
  includeWithoutDate: false,
};

export const defaultTodayLocationState: TodayLocationState = {
  status: 'idle',
  location: null,
};

export const defaultTodayDataState: TodayDataState = {
  tripsLoaded: false,
  loadingTripIds: [],
};

const pendingPlanStatuses = new Set<PlanRecord['status']>(['pending', 'proposed']);

export function getLocalTodayIsoDate() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localTime.toISOString().slice(0, 10);
}

export function isPendingPlanStatus(status: PlanRecord['status']) {
  return pendingPlanStatuses.has(status);
}

export function isPendingPlan(plan: PlanRecord) {
  return isPendingPlanStatus(plan.status);
}

export function getLocationDistanceKm(userLocation: TodayUserLocation | null, plan: PlanRecord) {
  if (!userLocation || !hasPlanLocation(plan)) {
    return undefined;
  }

  return getDistanceBetweenCoordinates(userLocation, {
    latitude: plan.locationLat,
    longitude: plan.locationLng,
  });
}

function getSearchText(item: TodayPlanItem) {
  return [
    item.trip.name,
    item.trip.location,
    item.plan.name,
    item.plan.description,
    item.plan.locationName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesDateFilter(item: TodayPlanItem, filters: TodayFilters) {
  if (!filters.date && !filters.includeWithoutDate) {
    return true;
  }

  if (filters.date && filters.includeWithoutDate) {
    return item.plan.date === filters.date || !item.plan.date;
  }

  if (filters.date) {
    return item.plan.date === filters.date;
  }

  return !item.plan.date;
}

function matchesStatusFilter(item: TodayPlanItem, filters: TodayFilters) {
  if (filters.status === 'all-open') {
    return isPendingPlan(item.plan);
  }

  return item.plan.status === filters.status;
}

function matchesDistanceFilter(item: TodayPlanItem, filters: TodayFilters) {
  if (filters.maxDistanceKm === 'all') {
    return true;
  }

  const maxDistanceKm = Number(filters.maxDistanceKm);

  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    return true;
  }

  return typeof item.distanceKm === 'number' && item.distanceKm <= maxDistanceKm;
}

export function matchesTodayFilters(item: TodayPlanItem, filters: TodayFilters) {
  const query = filters.search.trim().toLowerCase();
  const matchesQuery = !query || getSearchText(item).includes(query);
  const matchesTrip = filters.tripId === 'all' || item.trip.id === filters.tripId;
  const matchesCategory = filters.category === 'all' || item.plan.category === filters.category;

  return (
    matchesQuery &&
    matchesTrip &&
    matchesCategory &&
    matchesStatusFilter(item, filters) &&
    matchesDistanceFilter(item, filters) &&
    matchesDateFilter(item, filters)
  );
}

function getDateSortValue(plan: PlanRecord, today: string) {
  if (!plan.date) {
    return `2|9999-99-99|${plan.time ?? '99:99'}`;
  }

  if (plan.date < today) {
    return `1|${plan.date}|${plan.time ?? '99:99'}`;
  }

  return `0|${plan.date}|${plan.time ?? '99:99'}`;
}

export function sortTodayItems(items: TodayPlanItem[], location: TodayUserLocation | null) {
  const today = getLocalTodayIsoDate();

  return [...items].sort((left, right) => {
    if (location) {
      const leftHasDistance = typeof left.distanceKm === 'number';
      const rightHasDistance = typeof right.distanceKm === 'number';

      if (leftHasDistance && rightHasDistance && left.distanceKm !== right.distanceKm) {
        return (left.distanceKm ?? 0) - (right.distanceKm ?? 0);
      }

      if (leftHasDistance !== rightHasDistance) {
        return leftHasDistance ? -1 : 1;
      }
    }

    return [
      getDateSortValue(left.plan, today),
      left.trip.name,
      left.plan.name,
    ]
      .join('|')
      .localeCompare(
        [
          getDateSortValue(right.plan, today),
          right.trip.name,
          right.plan.name,
        ].join('|'),
      );
  });
}

export function getTodayItems(
  trips: TripRecord[],
  plansByTrip: Record<string, PlanRecord[]>,
  location: TodayUserLocation | null,
) {
  const items = trips.flatMap((trip) =>
    (plansByTrip[trip.id] ?? [])
      .filter(isPendingPlan)
      .map((plan) => ({
        plan,
        trip,
        distanceKm: getLocationDistanceKm(location, plan),
      })),
  );

  return {
    items: sortTodayItems(items, location),
    tripsWithPendingPlans: trips.filter((trip) =>
      (plansByTrip[trip.id] ?? []).some(isPendingPlan),
    ),
  };
}

export function isLocationImprecise(accuracyMeters: number | undefined) {
  return typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters) && accuracyMeters > 5000;
}
