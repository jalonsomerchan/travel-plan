import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getGoogleMapsDirectionsUrl, getGoogleMapsPlaceUrl } from '../../lib/app/location-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getCategoryLabel,
  getPageTranslator,
  getPlanStatusLabel,
  getPlanStatusTone,
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
          <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-xs)]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-2xl font-black">${escapeHtml(plan.name)}</h2>
                <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(trip.name)} · ${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
              </div>
              <span class="status-pill" data-tone="${getPlanStatusTone(plan.status)}">${escapeHtml(getPlanStatusLabel(locale, plan.status))}</span>
            </div>
            <dl class="mt-6 grid gap-4 md:grid-cols-2">
              <div><dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('plan.form.category'))}</dt><dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(getCategoryLabel(locale, plan.category))}</dd></div>
              <div><dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('plan.form.date'))}</dt><dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(formatPlanMoment(plan, locale) || t('calendar.unscheduled'))}</dd></div>
              <div class="md:col-span-2"><dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('plan.form.description'))}</dt><dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(plan.description || t('plan.descriptionEmpty'))}</dd></div>
              ${
                hasPlanLocation(plan)
                  ? `
                    <div class="md:col-span-2">
                      <dt class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('plan.location.selected'))}</dt>
                      <dd class="mt-1 text-base text-[var(--color-text)]">${escapeHtml(getPlanLocationLabel(plan))}</dd>
                      <div class="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                        <div class="h-64 w-full" data-plan-map></div>
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
          </article>
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
