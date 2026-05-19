import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripMemberRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import {
  InviteUserToTripError,
  inviteUserToTrip,
  subscribeTrip,
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

function renderMembers(locale: Locale, members: TripMemberRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-member-list]');
  const t = getPageTranslator(locale);
  if (!target) return;
  if (members.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.membersEmpty'))}</article>`;
    return;
  }
  target.innerHTML = members.map((member) => `<article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4"><div class="flex items-center justify-between gap-3"><div><p class="font-semibold text-[var(--color-text)]">${escapeHtml(member.email)}</p><p class="mt-1 text-sm text-[var(--color-text-soft)]">${escapeHtml(getRoleLabel(locale, member.role))}</p></div><span class="status-pill" data-tone="primary">${escapeHtml(getRoleLabel(locale, member.role))}</span></div></article>`).join('');
}

function getInviteErrorMessage(locale: Locale, error: unknown) {
  const t = getPageTranslator(locale);

  if (error instanceof InviteUserToTripError) {
    return inviteErrorMessages[locale]?.[error.code] ?? t('trip.invite.error');
  }

  return t('trip.invite.error');
}

export function mountTripMembersPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#invite-form');
  const message = document.querySelector<HTMLElement>('#invite-message');
  const context = document.querySelector<HTMLElement>('[data-trip-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-members-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentUser: User | null = null;
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
      }
    });
    subscribeTripMembers(tripId, (members) => renderMembers(locale, members));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentTrip || !currentUser) return;
    const data = new FormData(form);
    setButtonBusy(button, true, t('trip.invite.action'), t('trip.invite.sending'));
    try {
      await inviteUserToTrip(currentUser, tripId, currentTrip.name, currentTrip.location, currentTrip.startDate, currentTrip.endDate, String(data.get('email') ?? ''), String(data.get('role') ?? 'viewer') as TripMemberRecord['role']);
      form.reset();
      setMessage(message, t('trip.invite.sent'), 'success');
    } catch (error) {
      setMessage(message, getInviteErrorMessage(locale, error), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.invite.action'), t('trip.invite.sending'));
    }
  });
}
