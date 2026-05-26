import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import { ensureListViewToggle } from './list-view-mode';
import { getPageTranslator, getTripStatusLabel, getTripStatusTone } from './shared';
import { expandTripsWithChildSummaries } from './trip-child-summaries';

function renderStats(locale: Locale, trips: TripRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-dashboard-stats]');

  if (!target) {
    return;
  }

  const visited = trips.filter((trip) => trip.status === 'visited').length;
  const upcoming = trips.filter((trip) => trip.status !== 'visited').length;
  target.innerHTML = [
    { label: t('dashboard.stat.total'), value: trips.length },
    { label: t('dashboard.stat.upcoming'), value: upcoming },
    { label: t('dashboard.stat.visited'), value: visited },
  ]
    .map(
      (item) => `<article class="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-3 text-center sm:px-4"><p class="text-xl font-black leading-none text-[var(--color-text)] sm:text-2xl">${item.value}</p><p class="mt-1 truncate text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.08em] text-[var(--color-text-soft)] sm:tracking-[0.14em]">${escapeHtml(item.label)}</p></article>`,
    )
    .join('');
}

function renderTrips(locale: Locale, trips: TripRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-trip-list]');

  if (!target) {
    return;
  }

  ensureListViewToggle(locale, target);

  const childTripsByParentId = trips.reduce<Map<string, TripRecord[]>>((accumulator, trip) => {
    if (!trip.parentTripId) {
      return accumulator;
    }

    const siblings = accumulator.get(trip.parentTripId) ?? [];
    siblings.push(trip);
    accumulator.set(trip.parentTripId, siblings);

    return accumulator;
  }, new Map());
  const rootTrips = trips.filter(
    (trip) => !trip.parentTripId || !trips.some((candidate) => candidate.id === trip.parentTripId),
  );
  const renderTripCard = (trip: TripRecord, nested = false) => `
    <a class="app-card-shell ${nested ? 'ml-5 border-l-4 border-l-[var(--color-primary-soft)] pl-4 sm:ml-8' : ''}" data-list-card href="${getAppUrl(locale, 'trip', { trip: trip.id })}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold text-[var(--color-text)]">${escapeHtml(trip.name)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(trip.location)}</p>
        </div>
        <span class="status-pill" data-list-detail data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
      </div>
      <p class="mt-4 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
    </a>
  `;

  target.innerHTML = rootTrips
    .map((trip) => [renderTripCard(trip), ...(childTripsByParentId.get(trip.id) ?? []).map((childTrip) => renderTripCard(childTrip, true))].join(''))
    .join('');
}

export function mountDashboardMiniTripsFallback({ locale }: { locale: Locale }) {
  const subscriptions = createSubscriptionScope();

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      return;
    }

    subscriptions.add(
      subscribeUserTrips(user.uid, (trips) => {
        const expandedTrips = expandTripsWithChildSummaries(trips);

        if (expandedTrips.length === trips.length) {
          return;
        }

        renderStats(locale, expandedTrips);
        renderTrips(locale, expandedTrips);
      }),
    );
  });
}
