import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getAccommodationInputFromForm,
  getAccommodationLocationLabel,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import {
  getGoogleMapsDirectionsUrl,
  getGoogleMapsPlaceUrl,
  getGoogleMapsPlaceUrlFromCoordinates,
} from '../../lib/app/location-links';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip, updateTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getPageTranslator,
  syncAccommodationShell,
} from './shared';
import { initLocationPickers } from './plan-location-picker';

function renderAccommodationView(locale: Locale, trip: TripRecord) {
  const target = document.querySelector<HTMLElement>('[data-accommodation-view]');
  const t = getPageTranslator(locale);

  if (!target) {
    return;
  }

  if (!trip.accommodation) {
    target.innerHTML = `
      <article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">
        ${escapeHtml(t('accommodation.emptyDescription'))}
      </article>
    `;
    return;
  }

  target.innerHTML = `
    <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-xs)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">${escapeHtml(
            trip.name,
          )}</p>
          <h2 class="mt-2 text-2xl font-black">${escapeHtml(trip.accommodation.name)}</h2>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(
            formatDateRange(trip.startDate, trip.endDate, locale),
          )}</p>
        </div>
      </div>
      <dl class="mt-6 grid gap-4">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(
            t('accommodation.form.location'),
          )}</dt>
          <dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(
            getAccommodationLocationLabel(trip.accommodation),
          )}</dd>
        </div>
        ${
          hasAccommodationLocation(trip.accommodation)
            ? `
              <div class="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                <div class="h-64 w-full" data-accommodation-map></div>
              </div>
              <div class="flex flex-wrap gap-3">
                <a class="app-card-link" data-variant="secondary" href="${escapeHtml(getGoogleMapsPlaceUrlFromCoordinates(trip.accommodation.locationLat, trip.accommodation.locationLng))}" rel="noreferrer" target="_blank">${escapeHtml(t('accommodation.openGoogleMaps'))}</a>
                <a class="app-card-link" data-variant="primary" href="${escapeHtml(getGoogleMapsDirectionsUrl(trip.accommodation.locationLat, trip.accommodation.locationLng))}" rel="noreferrer" target="_blank">${escapeHtml(t('plan.location.getDirections'))}</a>
              </div>
            `
            : ''
        }
      </dl>
    </article>
  `;

  const mapTarget = target.querySelector<HTMLElement>('[data-accommodation-map]');

  if (mapTarget && hasAccommodationLocation(trip.accommodation)) {
    const map = L.map(mapTarget, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([trip.accommodation.locationLat, trip.accommodation.locationLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.circleMarker([trip.accommodation.locationLat, trip.accommodation.locationLng], {
      radius: 10,
      color: '#0f766e',
      fillColor: '#34d399',
      fillOpacity: 0.92,
      weight: 3,
    })
      .bindPopup(escapeHtml(trip.accommodation.name))
      .addTo(map);

    setTimeout(() => map.invalidateSize(), 0);
  }
}

export function mountTripAccommodationPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#accommodation-form');
  const message = document.querySelector<HTMLElement>('#accommodation-form-message');
  const context = document.querySelector<HTMLElement>('[data-accommodation-context]');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const tripLink = document.querySelector<HTMLAnchorElement>('#accommodation-trip-link');
  const mapsLink = document.querySelector<HTMLAnchorElement>('#accommodation-maps-link');
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;

  if (!tripId || !form) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (tripLink) {
    tripLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  if (mapsLink) {
    mapsLink.hidden = true;
  }

  initLocationPickers();

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      if (!trip) {
        return;
      }

      currentTrip = trip;
      syncAccommodationShell(locale, trip);
      renderAccommodationView(locale, trip);

      if (context) {
        context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }

      (form.elements.namedItem('accommodationName') as HTMLInputElement).value =
        trip.accommodation?.name ?? '';
      (form.elements.namedItem('accommodationLocationName') as HTMLInputElement).value =
        trip.accommodation?.locationName ?? '';
      (form.elements.namedItem('accommodationLocationLat') as HTMLInputElement).value =
        typeof trip.accommodation?.locationLat === 'number'
          ? String(trip.accommodation.locationLat)
          : '';
      (form.elements.namedItem('accommodationLocationLng') as HTMLInputElement).value =
        typeof trip.accommodation?.locationLng === 'number'
          ? String(trip.accommodation.locationLng)
          : '';
      (form.elements.namedItem('accommodationLocationQuery') as HTMLInputElement).value =
        trip.accommodation ? getAccommodationLocationLabel(trip.accommodation) : '';
      initLocationPickers();

      if (mapsLink) {
        const mapUrl = hasAccommodationLocation(trip.accommodation)
          ? getGoogleMapsPlaceUrlFromCoordinates(
              trip.accommodation.locationLat,
              trip.accommodation.locationLng,
            )
          : trip.accommodation?.locationName
            ? getGoogleMapsPlaceUrl(trip.accommodation.locationName)
            : '';

        mapsLink.href = mapUrl || getAppUrl(locale, 'trip-accommodation', { trip: tripId });
        mapsLink.hidden = !mapUrl;
        mapsLink.target = mapUrl ? '_blank' : '';
        mapsLink.rel = mapUrl ? 'noreferrer' : '';
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentTrip) {
      return;
    }

    setButtonBusy(button, true, t('accommodation.form.save'), t('common.saving'));

    try {
      await updateTrip(tripId, {
        name: currentTrip.name,
        location: currentTrip.location,
        startDate: currentTrip.startDate,
        endDate: currentTrip.endDate,
        status: currentTrip.status,
        accommodation: getAccommodationInputFromForm(form),
      });
      setMessage(message, t('accommodation.form.saved'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('accommodation.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('accommodation.form.save'), t('common.saving'));
    }
  });
}
