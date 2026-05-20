import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import {
  buildInviteSharePayload,
  getInviteShareFallbackUrl,
} from '../../lib/app/invite-share';
import type { TripInviteRecord, TripMemberRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import {
  InviteUserToTripError,
  inviteUserToTrip,
  subscribeTrip,
  subscribeTripInvites,
  subscribeTripMembers,
} from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, getRoleLabel, syncTripNavigation, syncTripShell } from './shared';

const inviteErrorMessages: Record<Locale, Record<string, string>> = {
  es: {
    'duplicate-invite': 'Ya existe una invitacion pendiente para ese correo en este viaje.',
    'invalid-email': 'Escribe un correo valido para enviar la invitacion.',
    'invalid-recipient': 'Ese correo no puede recibir esta invitacion.',
  },
  en: {
    'duplicate-invite': 'There is already a pending invite for that email in this trip.',
    'invalid-email': 'Enter a valid email address to send the invite.',
    'invalid-recipient': 'That email cannot receive this invite.',
  },
};

function renderPeople(locale: Locale, members: TripMemberRecord[], invites: TripInviteRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-member-list]');
  const t = getPageTranslator(locale);
  if (!target) return;

  const memberCards = members.map(
    (member) => `<article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4"><div class="flex items-center justify-between gap-3"><div><p class="font-semibold text-[var(--color-text)]">${escapeHtml(member.email)}</p><p class="mt-1 text-sm text-[var(--color-text-soft)]">${escapeHtml(getRoleLabel(locale, member.role))}</p></div><span class="status-pill" data-tone="primary">${escapeHtml(getRoleLabel(locale, member.role))}</span></div></article>`,
  );

  const pendingCards = invites.map(
    (invite) => `<article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4"><div class="flex items-center justify-between gap-3"><div><p class="font-semibold text-[var(--color-text)]">${escapeHtml(invite.email)}</p><p class="mt-1 text-sm text-[var(--color-text-soft)]">${escapeHtml(getRoleLabel(locale, invite.role))}</p></div><span class="status-pill" data-tone="warning">${escapeHtml(t('trip.invite.pendingStatus'))}</span></div></article>`,
  );

  if (memberCards.length === 0 && pendingCards.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.membersEmpty'))}</article>`;
    return;
  }

  target.innerHTML = [
    ...memberCards,
    pendingCards.length > 0
      ? `<h3 class="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(t('trip.invite.pendingListTitle'))}</h3>`
      : '',
    ...pendingCards,
  ].join('');
}

function getInviteErrorMessage(locale: Locale, error: unknown) {
  const t = getPageTranslator(locale);

  if (error instanceof InviteUserToTripError) {
    return inviteErrorMessages[locale]?.[error.code] ?? t('trip.invite.error');
  }

  return t('trip.invite.error');
}

function getInviteUrl(locale: Locale) {
  return new URL(getAppUrl(locale, 'trip-invites'), window.location.origin).toString();
}

async function shareInvite(locale: Locale, trip: TripRecord, role: TripMemberRecord['role']) {
  const t = getPageTranslator(locale);
  const payload = buildInviteSharePayload({
    inviteUrl: getInviteUrl(locale),
    locale,
    roleLabel: getRoleLabel(locale, role),
    tripName: trip.name,
  });

  if (navigator.share) {
    await navigator.share(payload);
    return t('trip.invite.shareSuccess');
  }

  window.location.href = getInviteShareFallbackUrl(payload);
  return t('trip.invite.shareFallback');
}

export function mountTripMembersPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#invite-form');
  const message = document.querySelector<HTMLElement>('#invite-message');
  const context = document.querySelector<HTMLElement>('[data-trip-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-members-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const shareButton = document.querySelector<HTMLButtonElement>('#invite-share-button');
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentUser: User | null = null;
  let currentMembers: TripMemberRecord[] = [];
  let currentInvites: TripInviteRecord[] = [];
  if (!tripId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (backLink) backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  observeSession((user) => {
    currentUser = user;
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      if (trip) {
        syncTripShell(locale, trip);
        if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
        subscribeTripInvites(tripId, trip.ownerId, (invites) => {
          currentInvites = invites;
          renderPeople(locale, currentMembers, currentInvites);
        });
      }
    });
    subscribeTripMembers(tripId, (members) => {
      currentMembers = members;
      renderPeople(locale, currentMembers, currentInvites);
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentTrip || !currentUser) return;
    const data = new FormData(form);
    const role = String(data.get('role') ?? 'viewer') as TripMemberRecord['role'];
    setButtonBusy(button, true, t('trip.invite.action'), t('trip.invite.sending'));
    try {
      await inviteUserToTrip(currentUser, tripId, currentTrip.name, currentTrip.location, currentTrip.startDate, currentTrip.endDate, String(data.get('email') ?? ''), role);
      form.reset();
      setMessage(message, t('trip.invite.sent'), 'success');
    } catch (error) {
      setMessage(message, getInviteErrorMessage(locale, error), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.invite.action'), t('trip.invite.sending'));
    }
  });
  shareButton?.addEventListener('click', async () => {
    if (!currentTrip || !currentUser || !form) return;
    const data = new FormData(form);
    const role = String(data.get('role') ?? 'viewer') as TripMemberRecord['role'];
    setButtonBusy(shareButton, true, t('trip.invite.shareAction'), t('trip.invite.sending'));
    try {
      await inviteUserToTrip(currentUser, tripId, currentTrip.name, currentTrip.location, currentTrip.startDate, currentTrip.endDate, String(data.get('email') ?? ''), role);
      setMessage(message, await shareInvite(locale, currentTrip, role), 'success');
    } catch (error) {
      setMessage(message, getInviteErrorMessage(locale, error), 'danger');
    } finally {
      setButtonBusy(shareButton, false, t('trip.invite.shareAction'), t('trip.invite.sending'));
    }
  });
}
