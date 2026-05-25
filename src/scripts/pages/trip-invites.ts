import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripInviteRecord } from '../../lib/app/models';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { acceptInvite, subscribePendingInvites } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getPageTranslator, getRoleLabel } from './shared';
import { ensureListViewToggle, initListViewMode } from './list-view-mode';

function renderInvites(locale: Locale, invites: TripInviteRecord[], user: User) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-invite-list]');
  if (!target) return;
  ensureListViewToggle(locale, target);
  if (invites.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('dashboard.invitesEmpty'))}</article>`;
    return;
  }
  target.innerHTML = invites.map((invite) => `
    <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5" data-list-card>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-bold">${escapeHtml(invite.tripName)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(invite.tripLocation)} · ${escapeHtml(formatDateRange(invite.tripStartDate, invite.tripEndDate, locale))}</p>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(getRoleLabel(locale, invite.role))}</p>
        </div>
        <button class="inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)]" type="button" data-accept-invite="${invite.id}">${escapeHtml(t('dashboard.acceptInvite'))}</button>
      </div>
    </article>
  `).join('');
  target.querySelectorAll<HTMLButtonElement>('[data-accept-invite]').forEach((button) => {
    button.addEventListener('click', async () => {
      const invite = invites.find((item) => item.id === button.dataset.acceptInvite);
      if (!invite) return;
      button.disabled = true;
      try {
        await acceptInvite(user, invite);
      } catch (error) {
        button.disabled = false;
        renderInvitesError(locale, error instanceof Error ? error.message : undefined);
      }
    });
  });
}

function renderInvitesError(locale: Locale, detail?: string) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-invite-list]');

  if (!target) return;

  target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-5 py-8 text-center text-sm text-[var(--color-danger)]">${escapeHtml(t('dashboard.invitesError'))}${detail ? `<br /><span class="mt-2 block text-xs">${escapeHtml(detail)}</span>` : ''}</article>`;
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

export function mountTripInvitesPage({ locale }: { locale: Locale }) {
  const subscriptions = createSubscriptionScope();
  if (!ensureFirebaseReady(locale)) return;
  initListViewMode(locale);

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    if (!user.email) {
      renderInvitesError(locale);
      return;
    }
    subscriptions.add(
      subscribePendingInvites(
        user.email,
        (invites) => renderInvites(locale, invites, user),
        (error) => {
          logInvitesPermissionError(user);
          renderInvitesError(locale, error.message);
        },
      ),
    );
  });
}
