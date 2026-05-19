import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatFriendlyDate, formatPlanMoment } from '../../lib/app/format';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getPlanStatusLabel, syncTripNavigation, syncTripShell } from './shared';

function renderTimeline(locale: Locale, tripId: string, plans: PlanRecord[]) {
  const t = getPageTranslator(locale);
  const groupsTarget = document.querySelector<HTMLElement>('[data-trip-calendar-groups]');
  const eventsTarget = document.querySelector<HTMLElement>('[data-calendar-events]');

  if (!groupsTarget || !eventsTarget) {
    return;
  }

  const datedPlans = plans.filter((plan) => plan.date);
  const unscheduledPlans = plans.filter((plan) => !plan.date);
  const groupedPlans = datedPlans.reduce<Record<string, PlanRecord[]>>((accumulator, plan) => {
    const key = plan.date ?? '';
    accumulator[key] ??= [];
    accumulator[key].push(plan);
    return accumulator;
  }, {});
  const orderedDates = Object.keys(groupedPlans).sort();

  groupsTarget.innerHTML = orderedDates.length
    ? orderedDates
        .map((date) => `
          <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-xs)]">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(date)}</p>
                <h3 class="mt-2 text-xl font-black text-[var(--color-text)]">${escapeHtml(formatFriendlyDate(date, locale))}</h3>
              </div>
              <span class="status-pill" data-tone="primary">${groupedPlans[date].length}</span>
            </div>
            <div class="mt-5 grid gap-3">
              ${groupedPlans[date]
                .map((plan) => {
                  const categoryLabel = getCategoryLabel(locale, plan.category);

                  return `
                    <a class="app-card-shell p-4" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="flex items-center gap-2">
                            <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                            <h4 class="text-lg font-bold text-[var(--color-text)]">${escapeHtml(plan.name)}</h4>
                          </div>
                          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(plan.time ?? t('calendar.noTime'))}</p>
                        </div>
                        <span class="status-pill" data-tone="primary">${escapeHtml(getPlanStatusLabel(locale, plan.status))}</span>
                      </div>
                      <p class="mt-3 text-sm text-[var(--color-text-muted)]">${escapeHtml(categoryLabel)}</p>
                    </a>
                  `;
                })
                .join('')}
            </div>
          </article>
        `)
        .join('')
    : `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('calendar.empty'))}</article>`;

  eventsTarget.innerHTML = unscheduledPlans.length
    ? unscheduledPlans
        .map((plan) => {
          const categoryLabel = getCategoryLabel(locale, plan.category);

          return `
            <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
              <p class="text-sm font-semibold text-[var(--color-text-soft)]">${escapeHtml(t('calendar.unscheduled'))}</p>
              <div class="mt-2 flex items-center gap-2">
                <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
              </div>
              <p class="mt-2 text-sm text-[var(--color-text-muted)]">${escapeHtml(categoryLabel)} · ${escapeHtml(getPlanStatusLabel(locale, plan.status))}</p>
              <a class="mt-4 app-card-link" data-variant="secondary" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
                ${escapeHtml(t('trip.openPlan'))}
              </a>
            </article>
          `;
        })
        .join('')
    : `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('calendar.noUnscheduled'))}</article>`;
}

export function mountTripCalendarPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const tripName = document.querySelector<HTMLElement>('[data-calendar-trip-name]');
  const backLink = document.querySelector<HTMLAnchorElement>('#calendar-back-trip-link');

  if (!tripId) {
    if (tripName) {
      tripName.textContent = t('trip.missingId');
    }
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip: TripRecord | null) => {
      if (tripName) {
        tripName.textContent = trip?.name ?? t('trip.notFound');
      }
      if (trip) {
        syncTripShell(locale, trip);
      }
    });

    subscribeTripPlans(tripId, (plans) => {
      renderTimeline(locale, tripId, plans);
    });
  });
}
