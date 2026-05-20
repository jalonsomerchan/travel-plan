import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import type { TripPointOfInterestInput, TripPointOfInterestRecord } from '../../lib/app/models';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { getAppUrl } from '../../lib/app/routes';
import {
  createTripPointOfInterest,
  deleteTripPointOfInterest,
  subscribeTripPointsOfInterest,
  updateTripPointOfInterest,
} from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { initLocationPickers } from './plan-location-picker';
import {
  ensureFirebaseReady,
  getPageTranslator,
  revealAppShell,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  setBreadcrumbItem,
  syncTripNavigation,
} from './shared';

function getFormInput(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
}

function getPoiInput(form: HTMLFormElement): TripPointOfInterestInput | null {
  const name = String(new FormData(form).get('name') ?? '').trim();
  const icon = String(new FormData(form).get('icon') ?? 'pin').trim();
  const locationName = String(new FormData(form).get('locationName') ?? '').trim();
  const locationLat = Number(new FormData(form).get('locationLat') ?? Number.NaN);
  const locationLng = Number(new FormData(form).get('locationLng') ?? Number.NaN);

  if (!name || !locationName || !Number.isFinite(locationLat) || !Number.isFinite(locationLng)) {
    return null;
  }

  return { name, icon, locationName, locationLat, locationLng };
}

function resetForm(form: HTMLFormElement, cancelButton: HTMLButtonElement | null) {
  form.reset();
  const pointIdInput = getFormInput(form, 'pointId');
  const locationQuery = getFormInput(form, 'locationQuery');
  const locationName = getFormInput(form, 'locationName');
  const locationLat = getFormInput(form, 'locationLat');
  const locationLng = getFormInput(form, 'locationLng');

  if (pointIdInput) pointIdInput.value = '';
  if (locationQuery) locationQuery.value = '';
  if (locationName) locationName.value = '';
  if (locationLat) locationLat.value = '';
  if (locationLng) locationLng.value = '';
  if (cancelButton) cancelButton.hidden = true;
  initLocationPickers();
}

function renderPoiList(locale: Locale, points: TripPointOfInterestRecord[]) {
  const t = getPageTranslator(locale);
  const list = document.querySelector<HTMLElement>('[data-trip-poi-list]');
  const count = document.querySelector<HTMLElement>('[data-trip-poi-count]');

  if (count) {
    count.textContent = String(points.length);
  }

  if (!list) {
    return;
  }

  if (points.length === 0) {
    list.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripPois.empty'))}</article>`;
    return;
  }

  list.innerHTML = points
    .map(
      (point) => `
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-lg font-black text-[var(--color-primary)]">${escapeHtml(resolveTripPoiIcon(point.icon))}</span>
              <div class="min-w-0">
                <h3 class="font-bold text-[var(--color-text)]">${escapeHtml(point.name)}</h3>
                <p class="mt-1 break-words text-sm text-[var(--color-text-soft)]">${escapeHtml(point.locationName)}</p>
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <button class="app-card-link" data-trip-poi-edit="${escapeHtml(point.id)}" data-variant="secondary" type="button">${escapeHtml(t('common.edit'))}</button>
              <button class="app-card-link" data-trip-poi-delete="${escapeHtml(point.id)}" data-variant="danger" type="button">${escapeHtml(t('common.delete'))}</button>
            </div>
          </div>
        </article>
      `,
    )
    .join('');
}

export function mountTripPoisPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-poi-form');
  const message = document.querySelector<HTMLElement>('#trip-poi-message');
  const list = document.querySelector<HTMLElement>('[data-trip-poi-list]');
  const cancelButton = document.querySelector<HTMLButtonElement>('[data-trip-poi-cancel-edit]');
  const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  let currentPoints: TripPointOfInterestRecord[] = [];

  if (!tripId || !form || !list) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);
  initLocationPickers();

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();
    currentPoints = [];

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        if (!trip) {
          setAppShellTitle(t('trip.notFound'));
          setAppShellDescription('');
          setAppShellMeta([]);
          revealAppShell();
          return;
        }

        setAppShellTitle(t('tripPois.titleWithTrip').replace('{trip}', trip.name));
        setAppShellDescription(t('tripPois.description'));
        setAppShellMeta([trip.name]);
        setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
        revealAppShell();
        initLocationPickers();
      }),
    );

    subscriptions.add(
      subscribeTripPointsOfInterest(tripId, (points) => {
        currentPoints = points;
        renderPoiList(locale, points);
      }),
    );
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = getPoiInput(form);
    const pointId = String(new FormData(form).get('pointId') ?? '');

    if (!input) {
      setMessage(message, t('tripPois.form.locationRequired'), 'danger');
      return;
    }

    setButtonBusy(submitButton, true, t('tripPois.form.save'), t('common.saving'));

    try {
      if (pointId) {
        await updateTripPointOfInterest(tripId, pointId, input);
        setMessage(message, t('tripPois.form.updated'), 'success');
      } else {
        await createTripPointOfInterest(tripId, input);
        setMessage(message, t('tripPois.form.created'), 'success');
      }
      resetForm(form, cancelButton);
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('tripPois.form.error'), 'danger');
    } finally {
      setButtonBusy(submitButton, false, t('tripPois.form.save'), t('common.saving'));
    }
  });

  cancelButton?.addEventListener('click', () => {
    resetForm(form, cancelButton);
    setMessage(message, t('tripPois.form.helper'));
  });

  list.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null;
    const editButton = target?.closest<HTMLButtonElement>('[data-trip-poi-edit]');
    const deleteButton = target?.closest<HTMLButtonElement>('[data-trip-poi-delete]');

    if (editButton) {
      const point = currentPoints.find((entry) => entry.id === editButton.dataset.tripPoiEdit);

      if (!point) return;

      const values: Record<string, string> = {
        pointId: point.id,
        name: point.name,
        icon: point.icon,
        locationName: point.locationName,
        locationLat: String(point.locationLat),
        locationLng: String(point.locationLng),
        locationQuery: point.locationName,
      };

      Object.entries(values).forEach(([name, value]) => {
        const input = getFormInput(form, name);
        if (input) input.value = value;
      });

      if (cancelButton) cancelButton.hidden = false;
      initLocationPickers();
      form.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    if (deleteButton) {
      const pointId = deleteButton.dataset.tripPoiDelete;

      if (!pointId) return;

      deleteButton.disabled = true;
      try {
        await deleteTripPointOfInterest(tripId, pointId);
      } catch (error) {
        deleteButton.disabled = false;
        setMessage(message, error instanceof Error ? error.message : t('tripPois.form.error'), 'danger');
      }
    }
  });
}
