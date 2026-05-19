import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { getAccommodationInputFromForm } from '../../lib/app/accommodation';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { createTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator } from './shared';
import { initLocationPickers } from './plan-location-picker';

export function mountTripCreatePage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
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
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const data = new FormData(form);
    setButtonBusy(button, true, t('dashboard.createAction'), t('dashboard.creating'));
    try {
      const tripId = await createTrip(currentUser, {
        name: String(data.get('name') ?? ''),
        location: String(data.get('location') ?? ''),
        startDate: String(data.get('startDate') ?? ''),
        endDate: String(data.get('endDate') ?? ''),
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
        accommodation: getAccommodationInputFromForm(form),
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
