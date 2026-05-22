import { getDistanceBetweenCoordinates } from './accommodation';
import type { PlanRecord, TripRecord } from './models';
import { hasPlanLocation } from './plan-location';

export interface TodayUserLocation {
  latitude: number;
  longitude: number;
}

export interface TodayLocationState {
  isLoading: boolean;
  errorKey: 'geolocation.error.unsupported' | 'geolocation.error.unavailable' | null;
  location: TodayUserLocation | null;
}

export interface TodayFilters {
  search: string;
  tripId: string;
  category: string;
  status: string;
  dateMode: 'all' | 'today' | 'no-date';
  locationMode: 'all' | 'with-location' | 'without-location';
}

export interface TodayPlanItem {
  plan: PlanRecord;
  trip: TripRecord;
  distanceKm?: number;
}

export const defaultTodayFilters: TodayFilters = {
  search: '',
  tripId: 'all',
  category: 'all',
  status: 'all',
  dateMode: 'all',
  locationMode: 'all',
};

export const defaultTodayLocationState: TodayLocationState = {
  isLoading: false,
  errorKey: null,
  location: null,
};

export function getLocalTodayIsoDate() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localTime.toISOString().slice(0, 10);
}

export function isTripActiveOnDate(trip: TripRecord, today: string) {
  return Boolean(trip.startDate && trip.endDate && trip.startDate <= today && trip.endDate >= today);
}

export function isPlanRelevantToday(plan: PlanRecord, today: string) {
  return plan.status !== 'visited' && plan.status !== 'discarded' && (!plan.date || plan.date === today);
}

export function getLocationDistanceKm(userLocation: TodayUserLocation | null, plan: PlanRecord) {
  if (!userLocation || !hasPlanLocation(plan)) {
    return undefined;
  }

  return getDistanceBetweenCoordinates(
    userLocation.latitude,
    userLocation.longitude,
    plan.locationLat,
    plan.locationLng,
  );
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

export function matchesTodayFilters(item: TodayPlanItem, filters: TodayFilters) {
  const query = filters.search.trim().toLowerCase();
  const matchesQuery = !query || getSearchText(item).includes(query);
  const matchesTrip = filters.tripId === 'all' || item.trip.id === filters.tripId;
  const matchesCategory = filters.category === 'all' || item.plan.category === filters.category;
  const matchesStatus = filters.status === 'all' || item.plan.status === filters.status;
  const matchesDate =
    filters.dateMode === 'all' ||
    (filters.dateMode === 'today' && Boolean(item.plan.date)) ||
    (filters.dateMode === 'no-date' && !item.plan.date);
  const matchesLocation =
    filters.locationMode === 'all' ||
    (filters.locationMode === 'with-location' && hasPlanLocation(item.plan)) ||
    (filters.locationMode === 'without-location' && !hasPlanLocation(item.plan));

  return (
    matchesQuery &&
    matchesTrip &&
    matchesCategory &&
    matchesStatus &&
    matchesDate &&
    matchesLocation
  );
}

export function sortTodayItems(items: TodayPlanItem[], location: TodayUserLocation | null) {
  return [...items].sort((left, right) => {
    if (location) {
      const leftHasDistance = typeof left.distanceKm === 'number';
      const rightHasDistance = typeof right.distanceKm === 'number';

      if (leftHasDistance && rightHasDistance) {
        return (left.distanceKm ?? 0) - (right.distanceKm ?? 0);
      }

      if (leftHasDistance !== rightHasDistance) {
        return leftHasDistance ? -1 : 1;
      }
    }

    return [
      left.plan.date ?? '9999-99-99',
      left.plan.time ?? '99:99',
      left.trip.name,
      left.plan.name,
    ]
      .join('|')
      .localeCompare(
        [
          right.plan.date ?? '9999-99-99',
          right.plan.time ?? '99:99',
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
  today = getLocalTodayIsoDate(),
) {
  const activeTrips = trips.filter((trip) => isTripActiveOnDate(trip, today));
  const items = activeTrips.flatMap((trip) =>
    (plansByTrip[trip.id] ?? [])
      .filter((plan) => isPlanRelevantToday(plan, today))
      .map((plan) => ({
        plan,
        trip,
        distanceKm: getLocationDistanceKm(location, plan),
      })),
  );

  return {
    activeTrips,
    items: sortTodayItems(items, location),
  };
}
