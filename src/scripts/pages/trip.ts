import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getPlanStatusLabel, getPlanStatusTone, getTripStatusLabel, getTripStatusTone } from './shared';

function renderTripSummary(locale: Locale, trip: TripRecord | null) {
  const target = document.querySelector<HTMLElement>('[data-trip-summary]');
  const t = getPageTranslator(locale);
  if (!target || !trip) return;
  target.innerHTML = `
    <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-xs)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold">${escapeHtml(trip.name)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(trip.location)}</p>
        </div>
        <span class="status-pill" data-tone="${getTripStatusTone(trip.status)}">${escapeHtml(getTripStatusLabel(locale, trip.status))}</span>
      </div>
      <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(formatDateRange(trip.startDate, trip.endDate, locale))}</p>
      <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.summaryOwner'))}: ${escapeHtml(trip.ownerEmail)}</p>
    </article>
  `;
}

function renderPlans(locale: Locale, tripId: string, plans: PlanRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-plan-list]');
  const t = getPageTranslator(locale);
  if (!target) return;
  if (plans.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.plansEmpty'))}</article>`;
    return;
  }
  target.innerHTML = plans.map((plan) => `
    <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-xs)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(getCategoryLabel(locale, plan.category))}</p>
        </div>
        <span class="status-pill" data-tone="${getPlanStatusTone(plan.status)}">${escapeHtml(getPlanStatusLabel(locale, plan.status))}</span>
      </div>
      <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(plan.description || t('plan.descriptionEmpty'))}</p>
      <p class="mt-4 text-sm text-[var(--color-text-soft)]">${escapeHtml(formatPlanMoment(plan, locale) || t('calendar.unscheduled'))}</p>
      ${hasPlanLocation(plan) ? `<p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('plan.location.selected'))}: ${escapeHtml(getPlanLocationLabel(plan))}</p>` : ''}
      <div class="mt-5 flex flex-wrap gap-3">
        <a class="inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)]" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">${escapeHtml(t('trip.openPlan'))}</a>
        <a class="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${getAppUrl(locale, 'plan-edit', { trip: tripId, plan: plan.id })}">${escapeHtml(t('plan.goEdit'))}</a>
      </div>
    </article>
  `).join('');
}

export function mountTripPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const tripContext = document.querySelector<HTMLElement>('[data-trip-context]');
  const calendarLink = document.querySelector<HTMLAnchorElement>('#trip-calendar-link');
  const mapLink = document.querySelector<HTMLAnchorElement>('#trip-map-link');
  const editLink = document.querySelector<HTMLAnchorElement>('#trip-edit-link');
  const membersLink = document.querySelector<HTMLAnchorElement>('#trip-members-link');
  const createPlanLink = document.querySelector<HTMLAnchorElement>('#trip-create-plan-link');
  const t = getPageTranslator(locale);
  if (!tripId) {
    if (tripContext) tripContext.textContent = t('trip.missingId');
    return;
  }
  if (!ensureFirebaseReady(locale)) return;
  if (calendarLink) calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  if (mapLink) mapLink.href = getAppUrl(locale, 'map', { trip: tripId });
  if (editLink) editLink.href = getAppUrl(locale, 'trip-edit', { trip: tripId });
  if (membersLink) membersLink.href = getAppUrl(locale, 'trip-members', { trip: tripId });
  if (createPlanLink) createPlanLink.href = getAppUrl(locale, 'plan-create', { trip: tripId });
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      if (tripContext) tripContext.textContent = trip ? `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}` : t('trip.notFound');
      renderTripSummary(locale, trip);
    });
    subscribeTripPlans(tripId, (plans) => renderPlans(locale, tripId, plans));
  });
}
