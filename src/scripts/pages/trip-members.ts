import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripMemberRecord, TripRecord } from '../../lib/app/models';
import { observeSession } from '../../lib/firebase/session';
import { inviteUserToTrip, subscribeTrip, subscribeTripMembers } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, getRoleLabel } from './shared';

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

export function mountTripMembersPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#invite-form');
  const message = document.querySelector<HTMLElement>('#invite-message');
  const context = document.querySelector<HTMLElement>('[data-trip-context]');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentUser: User | null = null;
  if (!tripId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  observeSession((user) => {
    currentUser = user;
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      if (trip && context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
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
      setMessage(message, error instanceof Error ? error.message : t('trip.invite.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.invite.action'), t('trip.invite.sending'));
    }
  });
}
