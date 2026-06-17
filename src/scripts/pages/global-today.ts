import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import {
  defaultTodayDataState,
  defaultTodayLocationState,
  isLocationImprecise,
  type TodayDataState,
  type TodayLocationState,
  type TodayUserLocation,
} from '../../lib/app/global-today';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import { ensureFirebaseReady, redirectHome } from './shared';
import {
  renderGlobalTodayPage,
  renderGlobalTodayTripsError,
} from './global-today-render';
import { createGlobalTodayMapController } from './global-today-map';
import { initListViewMode } from './list-view-mode';

function logTripsPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribeUserTrips.globalToday.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

function getLocationStatus(location: TodayUserLocation): TodayLocationState['status'] {
  return isLocationImprecise(location.accuracyMeters) ? 'imprecise' : 'ready';
}

export function mountGlobalTodayPage({ locale }: { locale: Locale }) {
  const filtersForm = document.querySelector<HTMLFormElement>('[data-today-filters]');
  const locationButton = document.querySelector<HTMLButtonElement>('[data-today-location-action]');
  const mapToggleButton = document.querySelector<HTMLButtonElement>('[data-today-map-toggle]');
  const mapPanel = document.querySelector<HTMLDetailsElement>('[data-today-map-panel]');
  const subscriptions = createSubscriptionScope();
  const planSubscriptions = createSubscriptionScope();
  let trips: TripRecord[] = [];
  let plansByTrip: Record<string, PlanRecord[]> = {};
  let locationState: TodayLocationState = { ...defaultTodayLocationState };
  let dataState: TodayDataState = { ...defaultTodayDataState };

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  initListViewMode(locale);

  function sync() {
    const result = renderGlobalTodayPage(locale, trips, plansByTrip, locationState, dataState);

    mapController.sync({
      isOpen: Boolean(mapPanel?.open),
      items: result.visibleItems,
      locationState,
    });
  }

  const mapController = createGlobalTodayMapController(locale, {
    onLocation: (location) => {
      locationState = {
        status: getLocationStatus(location),
        location,
      };
      sync();
    },
  });

  filtersForm?.addEventListener('input', sync);
  filtersForm?.addEventListener('change', sync);
  filtersForm?.addEventListener('submit', (event) => event.preventDefault());

  mapToggleButton?.addEventListener('click', () => {
    if (!mapPanel) {
      return;
    }

    mapPanel.open = !mapPanel.open;
    sync();
  });

  mapPanel?.addEventListener('toggle', sync);

  locationButton?.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      locationState = {
        status: 'unsupported',
        location: null,
      };
      sync();
      return;
    }

    locationState = {
      status: 'locating',
      location: locationState.location,
    };
    sync();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        };

        locationState = {
          status: getLocationStatus(nextLocation),
          location: nextLocation,
        };
        sync();
      },
      (error) => {
        locationState = {
          status:
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable',
          location: null,
        };
        sync();
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
    );
  });

  const resetState = () => {
    trips = [];
    plansByTrip = {};
    dataState = { ...defaultTodayDataState, tripsLoaded: true };
    planSubscriptions.clear();
  };

  const clearSubscriptions = () => {
    subscriptions.clear();
    planSubscriptions.clear();
  };

  window.addEventListener('pagehide', clearSubscriptions, { once: true });

  observeSession((user) => {
    clearSubscriptions();
    resetState();

    if (!user) {
      redirectHome(locale);
      return;
    }

    dataState = { ...defaultTodayDataState };
    sync();

    subscriptions.add(
      subscribeUserTrips(
        user.uid,
        (items) => {
          trips = items;
          plansByTrip = {};
          planSubscriptions.clear();
          dataState = {
            tripsLoaded: true,
            loadingTripIds: items.map((trip) => trip.id),
          };
          sync();

          if (items.length === 0) {
            return;
          }

          items.forEach((trip) => {
            planSubscriptions.add(
              subscribeTripPlans(trip.id, (plans) => {
                plansByTrip[trip.id] = plans;
                dataState = {
                  tripsLoaded: true,
                  loadingTripIds: dataState.loadingTripIds.filter((itemId) => itemId !== trip.id),
                };
                sync();
              }),
            );
          });
        },
        () => {
          logTripsPermissionError(user);
          resetState();
          sync();
          renderGlobalTodayTripsError(locale);
        },
      ),
    );
  });
}
