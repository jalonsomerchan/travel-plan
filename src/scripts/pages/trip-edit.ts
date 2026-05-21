import type { Locale } from '../../config/site';
import {
  getAccommodationInputFromForm,
  getAccommodationLocationLabel,
} from '../../lib/app/accommodation';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import type { TripRecord } from '../../lib/app/models';
import { getTripLocationInputFromForm, getTripLocationValidationKey } from '../../lib/app/trip-location';
import { getAppUrl } from '../../lib/app/routes';
import { validateTripDateRange } from '../../lib/app/trip-date-range';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip, updateTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  formatTripDateRange,
  getPageTranslator,
  syncTripNavigation,
  syncTripShell,
} from './shared';
import { initLocationPickers } from './plan-location-picker';

export function mountTripEditPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-form');
  const message = document.querySelector<HTMLElement>('#trip-form-message');
  const context = document.querySelector<HTMLElement>('[data-trip-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-edit-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  if (!tripId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (backLink) backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  initLocationPickers();

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        if (!trip) return;
        syncTripShell(locale, trip);
        if (context) context.textContent = `${trip.name} · ${formatTripDateRange(locale, trip)}`;
        (form.elements.namedItem('name') as HTMLInputElement).value = trip.name;
        (form.elements.namedItem('location') as HTMLInputElement).value = trip.location;
        (form.elements.namedItem('locationLat') as HTMLInputElement).value =
          typeof trip.locationLat === 'number' ? String(trip.locationLat) : '';
        (form.elements.namedItem('locationLng') as HTMLInputElement).value =
          typeof trip.locationLng === 'number' ? String(trip.locationLng) : '';
        (form.elements.namedItem('locationQuery') as HTMLInputElement).value = trip.location;
        (form.elements.namedItem('startDate') as HTMLInputElement).value = trip.startDate;
        (form.elements.namedItem('endDate') as HTMLInputElement).value = trip.endDate;
        (form.elements.namedItem('status') as HTMLSelectElement).value = trip.status;
        (form.elements.namedItem('accommodationName') as HTMLInputElement).value =
          trip.accommodation?.name ?? '';
        (form.elements.namedItem('accommodationLocationName') as HTMLInputElement).value =
          trip.accommodation?.locationName ?? '';
        (form.elements.namedItem('accommodationLocationLat') as HTMLInputElement).value =
          typeof trip.accommodation?.locationLat === 'number' ? String(trip.accommodation.locationLat) : '';
        (form.elements.namedItem('accommodationLocationLng') as HTMLInputElement).value =
          typeof trip.accommodation?.locationLng === 'number' ? String(trip.accommodation.locationLng) : '';
        (form.elements.namedItem('accommodationLocationQuery') as HTMLInputElement).value =
          trip.accommodation ? getAccommodationLocationLabel(trip.accommodation) : '';
        initLocationPickers();
      }),
    );
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const startDate = String(data.get('startDate') ?? '');
    const endDate = String(data.get('endDate') ?? '');
    const dateRangeValidation = validateTripDateRange(startDate, endDate);
    const locationValidationKey = getTripLocationValidationKey(form);

    if (!dateRangeValidation.valid) {
      setMessage(message, t(dateRangeValidation.errorKey ?? 'trip.form.dateRangeError'), 'danger');
      return;
    }

    if (locationValidationKey) {
      setMessage(message, t(locationValidationKey), 'danger');
      return;
    }

    setButtonBusy(button, true, t('trip.form.save'), t('common.saving'));
    try {
      const tripLocation = getTripLocationInputFromForm(form);
      await updateTrip(tripId, {
        name: String(data.get('name') ?? ''),
        location: tripLocation.location,
        locationLat: tripLocation.locationLat,
        locationLng: tripLocation.locationLng,
        startDate,
        endDate,
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
        accommodation: getAccommodationInputFromForm(form),
      });
      window.location.href = getAppUrl(locale, 'trip', { trip: tripId });
      return;
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('trip.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.form.save'), t('common.saving'));
    }
  });
}
