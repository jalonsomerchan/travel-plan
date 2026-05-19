import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import type { PlanRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getPlanStatusLabel, syncTripShell } from './shared';

function renderPlanList(locale: Locale, tripId: string, plans: PlanRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-map-plan-list]');
  const count = document.querySelector<HTMLElement>('[data-map-count]');
  const locatedPlans = plans.filter(hasPlanLocation);

  if (count) {
    count.textContent = String(locatedPlans.length);
  }

  if (!target) {
    return;
  }

  if (locatedPlans.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('map.empty'))}</article>`;
    return;
  }

  target.innerHTML = locatedPlans
    .map(
      (plan) => `
        <a class="app-card-shell" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
          <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(getCategoryLabel(locale, plan.category))} · ${escapeHtml(getPlanStatusLabel(locale, plan.status))}</p>
          <p class="mt-3 text-sm text-[var(--color-text-muted)]">${escapeHtml(getPlanLocationLabel(plan))}</p>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(formatPlanMoment(plan, locale) || t('calendar.unscheduled'))}</p>
        </a>
      `,
    )
    .join('');
}

export function mountTripMapPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const tripName = document.querySelector<HTMLElement>('[data-map-trip-name]');
  const backTripLink = document.querySelector<HTMLAnchorElement>('#map-back-trip-link');
  const calendarLink = document.querySelector<HTMLAnchorElement>('#map-calendar-link');
  const mapCanvas = document.querySelector<HTMLElement>('[data-trip-map-canvas]');

  if (!tripId || !mapCanvas) {
    if (tripName) {
      tripName.textContent = t('trip.missingId');
    }
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (backTripLink) {
    backTripLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  if (calendarLink) {
    calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  }

  const map = L.map(mapCanvas, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([40.4168, -3.7038], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      if (tripName) {
        tripName.textContent = trip
          ? `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`
          : t('trip.notFound');
      }
      if (trip) {
        syncTripShell(locale, trip);
      }
    });

    subscribeTripPlans(tripId, (plans) => {
      const locatedPlans = plans.filter(hasPlanLocation);
      renderPlanList(locale, tripId, plans);
      markers.clearLayers();

      if (locatedPlans.length === 0) {
        map.setView([40.4168, -3.7038], 5);
        return;
      }

      const bounds = L.latLngBounds([]);

      locatedPlans.forEach((plan) => {
        if (!hasPlanLocation(plan)) {
          return;
        }

        const latLng = L.latLng(plan.locationLat, plan.locationLng);
        bounds.extend(latLng);

        L.circleMarker(latLng, {
          radius: 9,
          color: '#0f766e',
          fillColor: '#34d399',
          fillOpacity: 0.9,
          weight: 3,
        })
          .bindPopup(
            `
              <strong>${escapeHtml(plan.name)}</strong><br />
              ${escapeHtml(getPlanLocationLabel(plan))}<br />
              ${escapeHtml(getCategoryLabel(locale, plan.category))}
            `,
          )
          .addTo(markers);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      }
    });
  });
}
