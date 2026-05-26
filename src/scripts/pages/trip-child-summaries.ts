import type { TripRecord } from '../../lib/app/models';

export function expandTripsWithChildSummaries(trips: TripRecord[]): TripRecord[] {
  const tripsById = new Map<string, TripRecord>();

  for (const trip of trips) {
    tripsById.set(trip.id, trip);

    if (trip.parentTripId) {
      continue;
    }

    for (const childTrip of trip.childTrips) {
      if (tripsById.has(childTrip.id)) {
        continue;
      }

      tripsById.set(childTrip.id, {
        id: childTrip.id,
        name: childTrip.name,
        location: childTrip.location,
        startDate: childTrip.startDate,
        endDate: childTrip.endDate,
        status: childTrip.status,
        parentTripId: trip.id,
        childTrips: [],
        ownerId: '',
        ownerEmail: '',
        memberIds: [],
      });
    }
  }

  return Array.from(tripsById.values());
}
