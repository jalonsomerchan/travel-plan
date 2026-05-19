import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
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
        }
      });
    });
  });
}