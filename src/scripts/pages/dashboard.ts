import type { User } from 'firebase/auth';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { getFirebaseDb, getFirebasePublicConfig } from '../../lib/firebase/config';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { fetchUserTripsDirect } from '../../lib/firebase/trip-rest';
import { subscribePendingInvites, subscribeUserTrips } from '../../lib/firebase/trips';
import {
  getPendingChecklistItemsCount,
  subscribeTripsChecklistItems,
} from './checklist-summary';
import { ensureListViewToggle, initListViewMode } from './list-view-mode';
import {
  bindSignOut,
  ensureFirebaseReady,
  getPageTranslator,
  getTripStatusLabel,
  getTripStatusTone,
  revealAppShell,
} from './shared';

type DashboardDebugState = {
  enabled: boolean;
  projectId: string;
  authDomain: string;
  uid: string;
  email: string;
  tripsStatus: string;
  tripsCount: number | null;
  tripIds: string[];
  sdkStatus: string;
  sdkMemberIds: string[];
  sdkOwnerIds: string[];
  directStatus: string;
  directTripIds: string[];
  invitesStatus: string;
  invitesCount: number | null;
  error: string;
};

const dashboardDebugState: DashboardDebugState = {
  enabled: false,
  projectId: '',
  authDomain: '',
  uid: '',
  email: '',
  tripsStatus: 'waiting-session',
  tripsCount: null,
  tripIds: [],
  sdkStatus: 'disabled',
  sdkMemberIds: [],
  sdkOwnerIds: [],
  directStatus: 'disabled',
  directTripIds: [],
  invitesStatus: 'waiting-session',
  invitesCount: null,
  error: '',
};

function isDashboardDebugEnabled() {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

function renderDashboardDebug() {
  if (!dashboardDebugState.enabled) {
    return;
  }

  let target = document.querySelector<HTMLElement>('[data-dashboard-debug]');

  if (!target) {
    const host = document.querySelector<HTMLElement>('[data-trip-list]')?.parentElement;

    if (!host) {
      return;
    }

    target = document.createElement('aside');
    target.dataset.dashboardDebug = 'true';
    target.className =
      'mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-xs text-[var(--color-text-muted)]';
    host.prepend(target);
  }

  const sdkCount = dashboardDebugState.sdkMemberIds.length + dashboardDebugState.sdkOwnerIds.length;

  target.innerHTML = `
    <h2 class="text-sm font-black text-[var(--color-text)]">Debug Firebase</h2>
    <dl class="mt-3 grid gap-2 sm:grid-cols-2">
      <div><dt class="font-bold text-[var(--color-text)]">projectId</dt><dd>${escapeHtml(dashboardDebugState.projectId || '-')}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">authDomain</dt><dd>${escapeHtml(dashboardDebugState.authDomain || '-')}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">uid</dt><dd>${escapeHtml(dashboardDebugState.uid || '-')}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">email</dt><dd>${escapeHtml(dashboardDebugState.email || '-')}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">tripsStatus</dt><dd>${escapeHtml(dashboardDebugState.tripsStatus)}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">tripsCount</dt><dd>${dashboardDebugState.tripsCount ?? '-'}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">sdkServerStatus</dt><dd>${escapeHtml(dashboardDebugState.sdkStatus)}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">sdkServerCount</dt><dd>${sdkCount}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">directStatus</dt><dd>${escapeHtml(dashboardDebugState.directStatus)}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">directCount</dt><dd>${dashboardDebugState.directTripIds.length}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">invitesStatus</dt><dd>${escapeHtml(dashboardDebugState.invitesStatus)}</dd></div>
      <div><dt class="font-bold text-[var(--color-text)]">invitesCount</dt><dd>${dashboardDebugState.invitesCount ?? '-'}</dd></div>
    </dl>
    <p class="mt-3 break-words"><strong>tripIds:</strong> ${escapeHtml(dashboardDebugState.tripIds.join(', ') || '-')}</p>
    <p class="mt-2 break-words"><strong>sdkMemberIds:</strong> ${escapeHtml(dashboardDebugState.sdkMemberIds.join(', ') || '-')}</p>
    <p class="mt-2 break-words"><strong>sdkOwnerIds:</strong> ${escapeHtml(dashboardDebugState.sdkOwnerIds.join(', ') || '-')}</p>
    <p class="mt-2 break-words"><strong>directTripIds:</strong> ${escapeHtml(dashboardDebugState.directTripIds.join(', ') || '-')}</p>
    <p class="mt-2 break-words"><strong>error:</strong> ${escapeHtml(dashboardDebugState.error || '-')}</p>
  `;
}

function updateDashboardDebug(partial: Partial<DashboardDebugState>) {
  Object.assign(dashboardDebugState, partial);
  renderDashboardDebug();
}

async function runTripsSdkDebug(user: User) {
  if (!dashboardDebugState.enabled) {
    return;
  }

  updateDashboardDebug({
    sdkStatus: 'loading',
    sdkMemberIds: [],
    sdkOwnerIds: [],
    directStatus: 'loading',
    directTripIds: [],
  });

  try {
    const db = getFirebaseDb();
    const tripsRef = collection(db, 'trips');
    const [memberSnapshot, ownerSnapshot] = await Promise.all([
      getDocsFromServer(query(tripsRef, where('memberIds', 'array-contains', user.uid))),
      getDocsFromServer(query(tripsRef, where('ownerId', '==', user.uid))),
    ]);

    updateDashboardDebug({
      sdkStatus: 'received',
      sdkMemberIds: memberSnapshot.docs.map((item) => item.id),
      sdkOwnerIds: ownerSnapshot.docs.map((item) => item.id),
    });
  } catch (error) {
    updateDashboardDebug({ sdkStatus: 'error', error: String(error) });
  }

  try {
    const trips = await fetchUserTripsDirect(user);

    updateDashboardDebug({
      directStatus: 'received',
      directTripIds: trips.map((trip) => trip.id),
    });
  } catch (error) {
    updateDashboardDebug({ directStatus: 'error', error: String(error) });
  }
}

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
  ensureListViewToggle(locale, target);
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

function renderPendingChecklistNotice(locale: Locale, count: number) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-dashboard-checklist-count]');

  if (!target) {
    return;
  }

  target.hidden = count === 0;

  if (count === 0) {
    target.innerHTML = '';
    return;
  }

  const href = target.dataset.checklistsUrl || getAppUrl(locale, 'checklists');
  const label = t(count === 1 ? 'dashboard.checklistsPending.one' : 'dashboard.checklistsPending.other').replace(
    '{count}',
    String(count),
  );

  target.innerHTML = `<span class="mt-0.5 shrink-0" aria-hidden="true">!</span><a class="min-w-0 flex-1 break-words underline decoration-current/40 underline-offset-4" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
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
  const checklistSubscriptions = createSubscriptionScope();
  if (!ensureFirebaseReady(locale)) return;
  initListViewMode(locale);
  bindSignOut(signOutButton, locale);
  if (createTripLink) createTripLink.href = getAppUrl(locale, 'trip-create');
  if (invitesLink) invitesLink.href = getAppUrl(locale, 'trip-invites');

  dashboardDebugState.enabled = isDashboardDebugEnabled();
  let sessionRequest = 0;

  if (dashboardDebugState.enabled) {
    const config = getFirebasePublicConfig();
    updateDashboardDebug({
      projectId: config.projectId ?? '',
      authDomain: config.authDomain ?? '',
    });
  }

  window.addEventListener(
    'pagehide',
    () => {
      subscriptions.clear();
      checklistSubscriptions.clear();
    },
    { once: true },
  );

  observeSession((user) => {
    subscriptions.clear();
    checklistSubscriptions.clear();
    const activeSessionRequest = ++sessionRequest;
    let directFallbackRequest = 0;

    const syncPendingChecklists = (trips: TripRecord[]) => {
      subscribeTripsChecklistItems(trips, checklistSubscriptions, (itemsByTrip) => {
        renderPendingChecklistNotice(locale, getPendingChecklistItemsCount(itemsByTrip));
      });
    };

    if (!user) {
      updateDashboardDebug({ tripsStatus: 'no-user', invitesStatus: 'no-user' });
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    revealAppShell();
    updateDashboardDebug({
      uid: user.uid,
      email: user.email ?? '',
      tripsStatus: 'subscribing',
      sdkStatus: dashboardDebugState.enabled ? 'loading' : 'disabled',
      directStatus: dashboardDebugState.enabled ? 'loading' : 'disabled',
      invitesStatus: user.email ? 'subscribing' : 'no-email',
      error: '',
    });

    async function renderDirectTripsFallback() {
      const requestId = ++directFallbackRequest;
      updateDashboardDebug({ directStatus: 'loading', directTripIds: [] });

      try {
        const trips = await fetchUserTripsDirect(user);

        if (activeSessionRequest !== sessionRequest || requestId !== directFallbackRequest) {
          return true;
        }

        updateDashboardDebug({
          directStatus: 'received',
          directTripIds: trips.map((trip) => trip.id),
        });

        if (trips.length === 0) {
          renderStats(locale, []);
          renderTrips(locale, []);
          return true;
        }

        updateDashboardDebug({
          tripsStatus: 'received-direct',
          tripsCount: trips.length,
          tripIds: trips.map((trip) => trip.id),
        });
        renderStats(locale, trips);
        renderTrips(locale, trips);
        syncPendingChecklists(trips);

        return true;
      } catch (error) {
        updateDashboardDebug({ directStatus: 'error', error: String(error) });
        return false;
      }
    }

    void runTripsSdkDebug(user);
    subscriptions.add(
      subscribeUserTrips(
        user.uid,
        (trips) => {
          updateDashboardDebug({
            tripsStatus: 'received',
            tripsCount: trips.length,
            tripIds: trips.map((trip) => trip.id),
          });
          renderStats(locale, trips);
          renderTrips(locale, trips);
          syncPendingChecklists(trips);

          if (trips.length === 0) {
            void renderDirectTripsFallback();
          }
        },
        async (error) => {
          updateDashboardDebug({
            tripsStatus: 'error',
            tripsCount: null,
            tripIds: [],
            error: String(error),
          });
          logTripsPermissionError(user);
          if (await renderDirectTripsFallback()) {
            return;
          }
          renderStats(locale, []);
          renderTripsError(locale);
        },
      ),
    );

    if (user.email) {
      subscriptions.add(
        subscribePendingInvites(
          user.email,
          (invites) => {
            updateDashboardDebug({ invitesStatus: 'received', invitesCount: invites.length });
            renderInviteCount(locale, invites.length);
          },
          (error) => {
            updateDashboardDebug({ invitesStatus: 'error', error: String(error) });
            logInvitesPermissionError(user);
            renderInvitesError(locale);
          },
        ),
      );
    }
  });
}
