import type { Locale } from '../../config/site';
import type { ChecklistItemRecord, TripRecord } from '../../lib/app/models';
import { subscribeTripChecklistItems } from '../../lib/firebase/checklists';
import type { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { getPageTranslator } from './shared';
import type { ChecklistGroup } from './trip-checklist-groups';

export type ChecklistItemsByTrip = Map<string, ChecklistItemRecord[]>;
type SubscriptionScope = ReturnType<typeof createSubscriptionScope>;

export function getAllChecklistGroups(locale: Locale, trips: TripRecord[], itemsByTrip: ChecklistItemsByTrip) {
  const t = getPageTranslator(locale);

  return trips.map(
    (trip): ChecklistGroup => ({
      actionLabel: t('globalChecklists.openTripChecklist'),
      eyebrow: t('globalChecklists.tripEyebrow'),
      isParentTrip: true,
      items: itemsByTrip.get(trip.id) ?? [],
      showOpenLink: true,
      tripId: trip.id,
      tripName: trip.name,
    }),
  );
}

export function getPendingChecklistItemsCount(itemsByTrip: ChecklistItemsByTrip) {
  return [...itemsByTrip.values()].flat().filter((item) => item.status === 'pending').length;
}

export function subscribeTripsChecklistItems(
  trips: TripRecord[],
  subscriptions: SubscriptionScope,
  callback: (itemsByTrip: ChecklistItemsByTrip) => void,
) {
  const itemsByTrip: ChecklistItemsByTrip = new Map();

  subscriptions.clear();
  callback(itemsByTrip);

  trips.forEach((trip) => {
    subscriptions.add(
      subscribeTripChecklistItems(trip.id, (items) => {
        itemsByTrip.set(trip.id, items);
        callback(itemsByTrip);
      }),
    );
  });
}
