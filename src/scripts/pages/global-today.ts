import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import {
  defaultTodayLocationState,
  getLocalTodayIsoDate,
  isTripActiveOnDate,
  type TodayLocationState,
} from '../../lib/app/global-today';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import { ensureFirebaseReady, redirectHome } from './shared';
import { renderGlobalTodayPage, renderGlobalTodayTripsError } from './global-today-render';

function logTripsPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribeUserTrips.globalToday.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

export function mountGlobalTodayPage({ locale }: { locale: Locale }) {
  const filtersForm = document.querySelector<HTMLFormElement>('[data-today-filters]');
  const locationButton = document.querySelector<HTMLButtonElement>('[data-today-location-action]');
  const subscriptions = createSubscriptionScope();
  const planSubscriptions = createSubscriptionScope();
  let trips: TripRecord[] = [];
  let plansByTrip: Record<string, PlanRecord[]> = {};
  let locationState: TodayLocationState = { ...defaultTodayLocationState };

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  const sync = () => renderGlobalTodayPage(locale, trips, plansByTrip, locationState);

  filtersForm?.addEventListener('input', sync);
  filtersForm?.addEventListener('change', sync);
  filtersForm?.addEventListener('submit', (event) => event.preventDefault());

  locationButton?.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      locationState = {
        isLoading: false,
        errorKey: 'geolocation.error.unsupported',
        location: null,
      };
      sync();
      return;
    }

    locationState = {
      isLoading: true,
      errorKey: null,
      location: locationState.location,
    };
    sync();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationState = {
          isLoading: false,
          errorKey: null,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        };
        sync();
      },
      () => {
        locationState = {
          isLoading: false,
          errorKey: 'geolocation.error.unavailable',
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

    subscriptions.add(
      subscribeUserTrips(
        user.uid,
        (items) => {
          trips = items;
          planSubscriptions.clear();
          plansByTrip = {};
          sync();

          const today = getLocalTodayIsoDate();
          const activeTrips = trips.filter((trip) => isTripActiveOnDate(trip, today));

          activeTrips.forEach((trip) => {
            planSubscriptions.add(
              subscribeTripPlans(trip.id, (plans) => {
                plansByTrip[trip.id] = plans;
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
