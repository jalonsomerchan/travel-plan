import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { getAccommodationInputFromForm } from '../../lib/app/accommodation';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import type { TripRecord } from '../../lib/app/models';
import { getTripLocationInputFromForm, getTripLocationValidationKey } from '../../lib/app/trip-location';
import { getAppUrl } from '../../lib/app/routes';
import { validateTripDateRange } from '../../lib/app/trip-date-range';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { observeSession } from '../../lib/firebase/session';
import { createTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, syncTripParentNavigation } from './shared';
import { initLocationPickers } from './plan-location-picker';

export function mountTripCreatePage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const parentTripId = new URL(window.location.href).searchParams.get('parent') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-create-form');
  const message = document.querySelector<HTMLElement>('#trip-create-message');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  let currentUser: User | null = null;
  if (!ensureFirebaseReady(locale)) return;
  observeSession((user) => {
    currentUser = user;
    if (!user) window.location.href = locale === 'es' ? '/' : `/${locale}/`;
  });
  initLocationPickers();
  if (parentTripId) {
    void getTripOnce(parentTripId)
      .then((trip) => syncTripParentNavigation(locale, trip ? { id: trip.id, name: trip.name } : null))
      .catch(() => {
        syncTripParentNavigation(locale, null);
      });
  }
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;
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

    setButtonBusy(button, true, t('dashboard.createAction'), t('dashboard.creating'));
    try {
      const tripLocation = getTripLocationInputFromForm(form);
      const tripId = await createTrip(currentUser, {
        name: String(data.get('name') ?? ''),
        location: tripLocation.location,
        locationLat: tripLocation.locationLat,
        locationLng: tripLocation.locationLng,
        startDate,
        endDate,
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
        accommodation: getAccommodationInputFromForm(form),
        parentTripId: parentTripId || undefined,
      });
      setMessage(message, t('dashboard.created'), 'success');
      window.location.href = getAppUrl(locale, 'trip', { trip: tripId });
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('dashboard.createError'), 'danger');
    } finally {
      setButtonBusy(button, false, t('dashboard.createAction'), t('dashboard.creating'));
    }
  });
}
