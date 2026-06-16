import type { Locale } from '../../config/site';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { mountTripDestinationLinks } from './trip-destination-links';
import { renderMiniTrips } from './trip-mini-trips';
import { mountTripPlanOrder } from './trip-plan-order';

function getSelectedTab() {
  const selected = document.querySelector<HTMLButtonElement>('[data-trip-tab][aria-selected="true"]');

  return selected?.dataset.tripTab === 'mini-trips' ? 'mini-trips' : 'plans';
}

function syncPanels(hasMiniTrips: boolean) {
  if (!hasMiniTrips) {
    return;
  }

  const activeTab = getSelectedTab();
  const tripTabs = document.querySelector<HTMLElement>('[data-trip-tabs]');
  const planPanel = document.querySelector<HTMLElement>('[data-trip-panel="plans"]');
  const miniTripsPanel = document.querySelector<HTMLElement>('[data-trip-panel="mini-trips"]');
  const tripTabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-trip-tab]'));

  if (tripTabs) {
    tripTabs.hidden = false;
  }

  tripTabButtons.forEach((button) => {
    const isSelected = button.dataset.tripTab === activeTab;

    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });

  if (planPanel) {
    planPanel.hidden = activeTab !== 'plans';
  }

  if (miniTripsPanel) {
    miniTripsPanel.hidden = activeTab !== 'mini-trips';
  }
}

export function mountTripMiniTripsFallback({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const subscriptions = createSubscriptionScope();

  mountTripPlanOrder({ locale });
  mountTripDestinationLinks({ locale });

  if (!tripId) {
    return;
  }

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        if (!trip || trip.parentTripId || trip.childTrips.length === 0) {
          return;
        }

        renderMiniTrips(locale, trip.childTrips);
        syncPanels(true);
      }),
    );
  });
}
