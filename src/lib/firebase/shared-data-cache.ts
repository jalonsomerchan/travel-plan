import type { PlanRecord, TripRecord } from '../app/models';

export function getCachedTrip(_tripId: string): TripRecord | null {
  return null;
}

export function setCachedTrip(_trip: TripRecord) {}

export function clearCachedTrip(_tripId: string) {}

export function getCachedTripPlans(_tripId: string): PlanRecord[] | null {
  return null;
}

export function setCachedTripPlans(_tripId: string, _plans: PlanRecord[]) {}

export function clearCachedTripPlans(_tripId: string) {}

export function clearTripSharedCache(_tripId: string) {}

export function clearSharedDataCache() {}
