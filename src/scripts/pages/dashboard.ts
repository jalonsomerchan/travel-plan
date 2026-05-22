import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribePendingInvites, subscribeUserTrips } from '../../lib/firebase/trips';
import {
  bindSignOut,
  ensureFirebaseReady,
  getPageTranslator,
  getTripStatusLabel,
  getTripStatusTone,
  revealAppShell,
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
    .map(
      (item) => `
        <article class="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-3 text-center sm:px-4">
          <p class="text-xl font-black leading-none text-[var(--color-text)] sm:text-2xl">${item.value}</p>
          <p class="mt-1 truncate text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.08em] text-[var(--color-text-soft)] sm:tracking-[0.14em]">${escapeHtml(item.label)}</p>
        </article>
      `,
    )
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

  const childTripsByParentId = trips.reduce<Map<string, TripRecord[]>>((accumulator, trip) => {
    if (!trip.parentTripId) {
      return accumulator;
    }

    const siblings = accumulator.get(trip.parentTripId) ?? [];
    siblings.push(trip);
    accumulator.set(trip.parentTripId, siblings);

    return accumulator;
  }, new Map());

  const rootTrips = trips.filter((trip) => !trip.parentTripId || !trips.some((candidate) => candidate.id === trip.parentTripId));

  const renderTripCard = (trip: TripRecord, nested = false) => `
    <a class="app-card-shell ${nested ? 'ml-5 border-l-4 border-l-[var(--color-primary-soft)] pl-4 sm:ml-8' : ''}" href="${getAppUrl(locale, 'trip', { trip: trip.id })}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold text-[var(--color-text)]">${escapeHtml(trip.name)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(trip.location)}</p>
        </div>
        <span class="status-pill" data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
      </div>
      <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
    </a>
  `;

  const renderTripTree = (trip: TripRecord): string => {
    const childTrips = childTripsByParentId.get(trip.id) ?? [];

    return [
      renderTripCard(trip),
      ...childTrips.map((childTrip) => renderTripCard(childTrip, true)),
    ].join('');
  };

  target.innerHTML = rootTrips.map(renderTripTree).join('');
}

function renderTripsError(locale: Locale) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-trip-list]');

  if (!target) {
    return;
  }

  target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-5 py-8 text-center text-sm text-[var(--color-danger)]">${escapeHtml(t('firebase.permissionDenied'))}</article>`;
}

function renderInviteCount(locale: Locale, count: number) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-dashboard-invite-count]');
  const link = document.querySelector<HTMLElement>('#dashboard-invites-link');

  if (target) {
    target.hidden = count === 0;
    const label = count > 0 ? t('dashboard.pendingInvites').replace('{count}', String(count)) : '';
    target.innerHTML = label
      ? `<span class="mt-0.5 shrink-0" aria-hidden="true">i</span><span class="min-w-0 flex-1 break-words">${escapeHtml(label)}</span>`
      : '';
  }

  if (link) {
    link.textContent = count > 0 ? t('dashboard.goInvitesWithCount').replace('{count}', String(count)) : t('dashboard.goInvites');
  }
}

function renderInvitesError(locale: Locale) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-dashboard-invite-count]');

  if (target) {
    target.hidden = false;
    target.innerHTML = `<span class="mt-0.5 shrink-0" aria-hidden="true">!</span><span class="min-w-0 flex-1 break-words">${escapeHtml(t('dashboard.invitesError'))}</span>`;
    target.dataset.tone = 'danger';
  }
}

function logTripsPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribeUserTrips.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

function logInvitesPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribePendingInvites.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

export function mountDashboardPage({ locale }: { locale: Locale }) {
  const signOutButton = document.querySelector<HTMLElement>('#sign-out-button');
  const createTripLink = document.querySelector<HTMLAnchorElement>('#dashboard-create-trip-link');
  const invitesLink = document.querySelector<HTMLAnchorElement>('#dashboard-invites-link');
  const subscriptions = createSubscriptionScope();
  if (!ensureFirebaseReady(locale)) return;
  bindSignOut(signOutButton, locale);
  if (createTripLink) createTripLink.href = getAppUrl(locale, 'trip-create');
  if (invitesLink) invitesLink.href = getAppUrl(locale, 'trip-invites');

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    revealAppShell();
    subscriptions.add(
      subscribeUserTrips(
        user.uid,
        (trips) => {
          renderStats(locale, trips);
          renderTrips(locale, trips);
        },
        () => {
          logTripsPermissionError(user);
          renderStats(locale, []);
          renderTripsError(locale);
        },
      ),
    );

    if (user.email) {
      subscriptions.add(
        subscribePendingInvites(
          user.email,
          (invites) => renderInviteCount(locale, invites.length),
          () => {
            logInvitesPermissionError(user);
            renderInvitesError(locale);
          },
        ),
      );
    }
  });
}
