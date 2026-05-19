import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripInviteRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { acceptInvite, createTrip, subscribePendingInvites, subscribeUserTrips } from '../../lib/firebase/trips';
import {
  bindSignOut,
  ensureFirebaseReady,
  getPageTranslator,
  getRoleLabel,
  getTripStatusLabel,
  getTripStatusTone,
  redirectTo,
} from './shared';

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
      (item) => `
        <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-center">
          <p class="text-2xl font-black text-[var(--color-text)]">${item.value}</p>
          <p class="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(item.label)}</p>
        </article>
      `,
    )
    .join('');
}

function renderTrips(locale: Locale, trips: TripRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-trip-list]');

  if (!target) {
    return;
  }

  if (trips.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('dashboard.empty'))}</article>`;
    return;
  }

  target.innerHTML = trips
    .map((trip) => {
      const detailUrl = getAppUrl(locale, 'trip', { trip: trip.id });
      const calendarUrl = getAppUrl(locale, 'calendar', { trip: trip.id });

      return `
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-xs)]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-bold text-[var(--color-text)]">${escapeHtml(trip.name)}</h3>
              <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(trip.location)}</p>
            </div>
            <span class="status-pill" data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
          </div>
          <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <a class="inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)]" href="${detailUrl}">${escapeHtml(t('dashboard.openTrip'))}</a>
            <a class="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${calendarUrl}">${escapeHtml(t('dashboard.openCalendar'))}</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderInvites(locale: Locale, invites: TripInviteRecord[], onAccept: (inviteId: string) => void) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-invite-list]');

  if (!target) {
    return;
  }

  if (invites.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('dashboard.invitesEmpty'))}</article>`;
    return;
  }

  target.innerHTML = invites
    .map(
      (invite) => `
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-bold">${escapeHtml(invite.tripName)}</h3>
              <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(invite.tripLocation)} · ${escapeHtml(formatDateRange(invite.tripStartDate, invite.tripEndDate, locale))}</p>
              <p class="mt-2 text-sm text-[var(--color-text-muted)]">${escapeHtml(getRoleLabel(locale, invite.role))}</p>
            </div>
            <button class="inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)]" type="button" data-accept-invite="${invite.id}">
              ${escapeHtml(t('dashboard.acceptInvite'))}
            </button>
          </div>
        </article>
      `,
    )
    .join('');

  target.querySelectorAll<HTMLButtonElement>('[data-accept-invite]').forEach((button) => {
    button.addEventListener('click', () => onAccept(button.dataset.acceptInvite ?? ''));
  });
}

export function mountDashboardPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const createForm = document.querySelector<HTMLFormElement>('#trip-create-form');
  const createMessage = document.querySelector<HTMLElement>('#trip-create-message');
  const createButton = createForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const accountSummary = document.querySelector<HTMLElement>('[data-account-summary]');
  const signOutButton = document.querySelector<HTMLButtonElement>('#sign-out-button');
  let currentUser: User | null = null;
  let currentInvites: TripInviteRecord[] = [];
  let stopTrips = () => {};
  let stopInvites = () => {};

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  bindSignOut(signOutButton, locale);

  observeSession((user) => {
    currentUser = user;
    stopTrips();
    stopInvites();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    if (accountSummary) {
      accountSummary.textContent = user.email ?? t('dashboard.sessionReady');
    }

    stopTrips = subscribeUserTrips(user.uid, (trips) => {
      renderStats(locale, trips);
      renderTrips(locale, trips);
    });

    if (user.email) {
      stopInvites = subscribePendingInvites(user.email, (invites) => {
        currentInvites = invites;
        renderInvites(locale, invites, async (inviteId) => {
          const invite = currentInvites.find((item) => item.id === inviteId);

          if (!invite || !currentUser) {
            return;
          }

          await acceptInvite(currentUser, invite);
        });
      });
    }
  });

  createForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUser) {
      return;
    }

    const data = new FormData(createForm);
    setButtonBusy(createButton, true, t('dashboard.createAction'), t('dashboard.creating'));

    try {
      const tripId = await createTrip(currentUser, {
        name: String(data.get('name') ?? ''),
        location: String(data.get('location') ?? ''),
        startDate: String(data.get('startDate') ?? ''),
        endDate: String(data.get('endDate') ?? ''),
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
      });

      createForm.reset();
      setMessage(createMessage, t('dashboard.created'), 'success');
      redirectTo(locale, 'trip', { trip: tripId });
    } catch (error) {
      setMessage(createMessage, error instanceof Error ? error.message : t('dashboard.createError'), 'danger');
    } finally {
      setButtonBusy(createButton, false, t('dashboard.createAction'), t('dashboard.creating'));
    }
  });
}
