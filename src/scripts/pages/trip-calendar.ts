import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatFriendlyDate, formatPlanMoment } from '../../lib/app/format';
import { getPlanNameWithFlagsHtml } from '../../lib/app/plan-flags';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getPlanStatusLabel, syncTripNavigation, syncTripShell } from './shared';
import { ensureListViewToggle, initListViewMode } from './list-view-mode';

function renderTimeline(locale: Locale, tripId: string, plans: PlanRecord[]) {
  const t = getPageTranslator(locale);
  const groupsTarget = document.querySelector<HTMLElement>('[data-trip-calendar-groups]');
  const eventsTarget = document.querySelector<HTMLElement>('[data-calendar-events]');

  if (!groupsTarget || !eventsTarget) {
    return;
  }

  ensureListViewToggle(locale, groupsTarget);
  ensureListViewToggle(locale, eventsTarget);

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
                    <a class="app-card-shell p-4" data-list-card href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="flex items-center gap-2">
                            <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                            <h4 class="min-w-0 text-lg font-bold text-[var(--color-text)]">${getPlanNameWithFlagsHtml(plan, t)}</h4>
                          </div>
                          <p class="mt-2 text-sm text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(plan.time ?? t('calendar.noTime'))}</p>
                        </div>
                        <span class="status-pill" data-list-detail data-tone="primary">${escapeHtml(getPlanStatusLabel(locale, plan.status))}</span>
                      </div>
                      <p class="mt-3 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(categoryLabel)}</p>
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
            <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4" data-list-card>
              <p class="text-sm font-semibold text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(t('calendar.unscheduled'))}</p>
              <div class="mt-2 flex items-center gap-2">
                <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                <h3 class="min-w-0 text-lg font-bold text-[var(--color-text)]">${getPlanNameWithFlagsHtml(plan, t)}</h3>
              </div>
              <p class="mt-2 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(categoryLabel)} · ${escapeHtml(getPlanStatusLabel(locale, plan.status))}</p>
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
  const subscriptions = createSubscriptionScope();

  if (!tripId) {
    if (tripName) {
      tripName.textContent = t('trip.missingId');
    }
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  initListViewMode(locale);
  syncTripNavigation(locale, tripId);

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip: TripRecord | null) => {
        if (tripName) {
          tripName.textContent = trip?.name ?? t('trip.notFound');
        }
        if (trip) {
          syncTripShell(locale, trip);
        }
      }),
    );

    subscriptions.add(
      subscribeTripPlans(tripId, (plans) => {
        renderTimeline(locale, tripId, plans);
      }),
    );
  });
}
