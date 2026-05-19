import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getAccommodationLocationLabel,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { getGoogleMapsDirectionsUrl, getGoogleMapsPlaceUrl } from '../../lib/app/location-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getPageTranslator,
  syncPlanShell,
} from './shared';

const accommodationMarkerIcon = L.divIcon({
  className: 'plan-map-accommodation-marker',
  html: `
    <span aria-hidden="true" style="align-items:center;background:#0f766e;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;height:38px;justify-content:center;width:38px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 11.4 12 4l9 7.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V20h4.25v-5.5h4.5V20h4.25v-9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `,
  iconAnchor: [19, 38],
  iconSize: [38, 38],
  popupAnchor: [0, -38],
});

export function mountPlanPage({ locale }: { locale: Locale }) {
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const view = document.querySelector<HTMLElement>('[data-plan-view]');
  const editLink = document.querySelector<HTMLAnchorElement>('#plan-edit-link');
  const t = getPageTranslator(locale);
  let map: L.Map | null = null;
  if (!tripId || !planId || !view) return;
  if (!ensureFirebaseReady(locale)) return;
  if (editLink) editLink.href = getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId });
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      if (!trip) return;
      subscribePlan(tripId, planId, (plan) => {
        if (!plan) return;
        syncPlanShell(locale, trip, plan);

        if (map) {
          map.remove();
          map = null;
        }

        view.innerHTML = `
          <div class="mt-8 border-t border-[var(--color-border)] pt-6">
            <dl class="grid gap-4">
              <div><dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('plan.form.description'))}</dt><dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(plan.description || t('plan.descriptionEmpty'))}</dd></div>
              ${
                hasPlanLocation(plan)
                  ? `
                    <div>
                      <div class="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                        <div class="h-[30rem] w-full" data-plan-map></div>
                      </div>
                      <div class="mt-4 flex flex-wrap gap-3">
                        <a class="app-card-link" data-variant="secondary" href="${escapeHtml(getGoogleMapsPlaceUrl(getPlanLocationLabel(plan)))}" rel="noreferrer" target="_blank">${escapeHtml(t('plan.location.openMap'))}</a>
                        <a class="app-card-link" data-variant="primary" href="${escapeHtml(getGoogleMapsDirectionsUrl(plan.locationLat, plan.locationLng))}" rel="noreferrer" target="_blank">${escapeHtml(t('plan.location.getDirections'))}</a>
                      </div>
                    </div>
                  `
                  : ''
              }
            </dl>
          </div>
        `;

        const mapTarget = view.querySelector<HTMLElement>('[data-plan-map]');

        if (mapTarget && hasPlanLocation(plan)) {
          map = L.map(mapTarget, {
            zoomControl: true,
            scrollWheelZoom: false,
          }).setView([plan.locationLat, plan.locationLng], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          L.circleMarker([plan.locationLat, plan.locationLng], {
            radius: 10,
            color: '#0f766e',
            fillColor: '#34d399',
            fillOpacity: 0.92,
            weight: 3,
          })
            .bindPopup(escapeHtml(plan.name))
            .addTo(map);

          const accommodation = trip.accommodation;

          if (hasAccommodationLocation(accommodation)) {
            const accommodationLabel = getAccommodationLocationLabel(accommodation);
            const accommodationLat = accommodation.locationLat;
            const accommodationLng = accommodation.locationLng;

            L.marker([accommodationLat, accommodationLng], {
              icon: accommodationMarkerIcon,
              keyboard: true,
              title: accommodationLabel || accommodation.name,
            })
              .bindPopup(escapeHtml(accommodationLabel || accommodation.name))
              .addTo(map);

            map.fitBounds(
              L.latLngBounds([
                [plan.locationLat, plan.locationLng],
                [accommodationLat, accommodationLng],
              ]),
              { maxZoom: 15, padding: [48, 48] },
            );
          }
        }
      });
    });
  });
}
