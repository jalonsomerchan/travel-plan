import type { Locale } from '../../config/site';
import {
  getAccommodationInputFromForm,
  getAccommodationLocationLabel,
} from '../../lib/app/accommodation';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { validateTripDateRange } from '../../lib/app/trip-date-range';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip, updateTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, syncTripShell } from './shared';
import { initLocationPickers } from './plan-location-picker';

export function mountTripEditPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-form');
  const message = document.querySelector<HTMLElement>('#trip-form-message');
  const context = document.querySelector<HTMLElement>('[data-trip-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-edit-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  if (!tripId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  if (backLink) backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  initLocationPickers();
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      if (!trip) return;
      syncTripShell(locale, trip);
      if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      (form.elements.namedItem('name') as HTMLInputElement).value = trip.name;
      (form.elements.namedItem('location') as HTMLInputElement).value = trip.location;
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
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const startDate = String(data.get('startDate') ?? '');
    const endDate = String(data.get('endDate') ?? '');
    const dateRangeValidation = validateTripDateRange(startDate, endDate);

    if (!dateRangeValidation.valid) {
      setMessage(message, t(dateRangeValidation.errorKey ?? 'trip.form.dateRangeError'), 'danger');
      return;
    }

    setButtonBusy(button, true, t('trip.form.save'), t('common.saving'));
    try {
      await updateTrip(tripId, {
        name: String(data.get('name') ?? ''),
        location: String(data.get('location') ?? ''),
        startDate,
        endDate,
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
        accommodation: getAccommodationInputFromForm(form),
      });
      setMessage(message, t('trip.form.saved'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('trip.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.form.save'), t('common.saving'));
    }
  });
}
