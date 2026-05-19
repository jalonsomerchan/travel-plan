import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import {
  bindSignOut,
  ensureFirebaseReady,
  getPageTranslator,
  getTripStatusLabel,
  getTripStatusTone,
} from './shared';

function renderStats(locale: Locale, trips: TripRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-dashboard-stats]');
  if (!target) return;
  const visited = trips.filter((trip) => trip.status === 'visited').length;
  const upcoming = trips.filter((trip) => trip.status !== 'visited').length;
  target.innerHTML = [
    { label: t('dashboard.stat.total'), value: trips.length },
    { label: t('dashboard.stat.upcoming'), value: upcoming },
    { label: t('dashboard.stat.visited'), value: visited },
  ]
    .map((item) => `<article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-center"><p class="text-2xl font-black text-[var(--color-text)]">${item.value}</p><p class="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(item.label)}</p></article>`)
    .join('');
}

function renderTrips(locale: Locale, trips: TripRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-trip-list]');
  if (!target) return;
  if (trips.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('dashboard.empty'))}</article>`;
    return;
  }
  target.innerHTML = trips
    .map((trip) => `
      <a class="app-card-shell" href="${getAppUrl(locale, 'trip', { trip: trip.id })}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-bold text-[var(--color-text)]">${escapeHtml(trip.name)}</h3>
            <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(trip.location)}</p>
          </div>
          <span class="status-pill" data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
        </div>
        <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
      </a>
    `)
    .join('');
}

export function mountDashboardPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const accountSummary = document.querySelector<HTMLElement>('[data-account-summary]');
  const signOutButton = document.querySelector<HTMLButtonElement>('#sign-out-button');
  const createTripLink = document.querySelector<HTMLAnchorElement>('#dashboard-create-trip-link');
  const createTripInlineLink = document.querySelector<HTMLAnchorElement>('#dashboard-create-trip-inline-link');
  const invitesLink = document.querySelector<HTMLAnchorElement>('#dashboard-invites-link');
  if (!ensureFirebaseReady(locale)) return;
  bindSignOut(signOutButton, locale);
  if (createTripLink) createTripLink.href = getAppUrl(locale, 'trip-create');
  if (createTripInlineLink) createTripInlineLink.href = getAppUrl(locale, 'trip-create');
  if (invitesLink) invitesLink.href = getAppUrl(locale, 'trip-invites');
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    if (accountSummary) accountSummary.textContent = user.email ?? t('dashboard.sessionReady');
    subscribeUserTrips(user.uid, (trips) => {
      renderStats(locale, trips);
      renderTrips(locale, trips);
    });
  });
}
