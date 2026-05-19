import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { getCalendarGrid, getMonthCursor, getMonthKey, getMonthLabel } from '../../lib/app/format';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { getAppUrl } from '../../lib/app/routes';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import type { User } from 'firebase/auth';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getWeekdayLabels } from './shared';

function renderTripsPermissionError(locale: Locale) {
  const t = getPageTranslator(locale);
  const eventsTarget = document.querySelector<HTMLElement>('[data-global-events]');

  if (!eventsTarget) {
    return;
  }

  eventsTarget.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-5 py-8 text-center text-sm text-[var(--color-danger)]">${escapeHtml(t('firebase.permissionDenied'))}</article>`;
}

function logTripsPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribeUserTrips.globalCalendar.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

function renderWeekdays(locale: Locale, targetSelector: string) {
  const target = document.querySelector<HTMLElement>(targetSelector);

  if (!target) {
    return;
  }

  target.innerHTML = getWeekdayLabels(locale)
    .map((day) => `<span>${escapeHtml(day)}</span>`)
    .join('');
}

export function mountGlobalCalendarPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const prevButton = document.querySelector<HTMLButtonElement>('#global-calendar-prev-month');
  const nextButton = document.querySelector<HTMLButtonElement>('#global-calendar-next-month');
  const gridTarget = document.querySelector<HTMLElement>('[data-global-calendar-grid]');
  const eventsTarget = document.querySelector<HTMLElement>('[data-global-events]');
  const monthLabel = document.querySelector<HTMLElement>('[data-global-month-label]');
  let activeMonth = new URL(window.location.href).searchParams.get('month') ?? getMonthKey(new Date().getFullYear(), new Date().getMonth());
  let trips: TripRecord[] = [];
  let plansByTrip: Record<string, PlanRecord[]> = {};
  let stopPlans = () => {};

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  renderWeekdays(locale, '[data-global-weekdays]');

  const render = (plansByTrip: Record<string, PlanRecord[]>) => {
    if (!gridTarget || !eventsTarget || !monthLabel) {
      return;
    }

    const [year, month] = activeMonth.split('-').map(Number);
    monthLabel.textContent = getMonthLabel(locale, year, month - 1);

    const dayMap = Object.entries(plansByTrip).reduce<Record<string, Array<PlanRecord & { trip: TripRecord }>>>(
      (accumulator, [tripId, plans]) => {
        const trip = trips.find((item) => item.id === tripId);

        if (!trip) {
          return accumulator;
        }

        plans.forEach((plan) => {
          if (!plan.date || !plan.date.startsWith(activeMonth)) {
            return;
          }

          accumulator[plan.date] ??= [];
          accumulator[plan.date].push({ ...plan, trip });
        });

        return accumulator;
      },
      {},
    );
    const { firstWeekday, grid } = getCalendarGrid(year, month - 1);
    const leading = Array.from({ length: firstWeekday }, () => '<div class="min-h-[8rem] rounded-[var(--radius-md)] border border-transparent"></div>').join('');

    gridTarget.innerHTML =
      leading +
      grid
        .map((day) => {
          const dayPlans = dayMap[day.key] ?? [];

          return `
            <article class="min-h-[8rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-black text-[var(--color-text)]">${day.day}</p>
                <span class="text-xs text-[var(--color-text-soft)]">${dayPlans.length}</span>
              </div>
              <div class="mt-3 grid gap-2">
                ${dayPlans
                  .slice(0, 3)
                  .map((plan) => {
                    const categoryLabel = getCategoryLabel(locale, plan.category);

                    return `
                      <a class="rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] px-2 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)]" href="${getAppUrl(locale, 'plan', { trip: plan.trip.id, plan: plan.id })}">
                        <span class="flex items-center gap-1.5">
                          <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                          <span>${escapeHtml(plan.trip.name)} · ${escapeHtml(plan.name)}</span>
                        </span>
                        <span class="sr-only">${escapeHtml(categoryLabel)}</span>
                      </a>
                    `;
                  })
                  .join('')}
              </div>
            </article>
          `;
        })
        .join('');

    const timelineItems = Object.values(dayMap)
      .flat()
      .sort((left, right) => `${left.date}${left.time ?? ''}`.localeCompare(`${right.date}${right.time ?? ''}`));

    eventsTarget.innerHTML = timelineItems.length
      ? timelineItems
          .map((plan) => {
            const categoryLabel = getCategoryLabel(locale, plan.category);

            return `
              <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                <p class="text-sm font-semibold text-[var(--color-text-soft)]">${escapeHtml(plan.date ?? '')} ${escapeHtml(plan.time ?? '')}</p>
                <div class="mt-2 flex items-center gap-2">
                  <span style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
                  <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
                </div>
                <p class="mt-2 text-sm text-[var(--color-text-muted)]">${escapeHtml(plan.trip.name)} · ${escapeHtml(categoryLabel)}</p>
                <a class="mt-4 inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${getAppUrl(locale, 'trip', { trip: plan.trip.id })}">
                  ${escapeHtml(t('calendar.openTrip'))}
                </a>
              </article>
            `;
          })
          .join('')
      : `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('calendar.empty'))}</article>`;
  };

  const syncMonth = (delta: number) => {
    const cursor = getMonthCursor(activeMonth);
    const nextDate = new Date(cursor.year, cursor.month + delta, 1);
    activeMonth = getMonthKey(nextDate.getFullYear(), nextDate.getMonth());
    const url = new URL(window.location.href);
    url.searchParams.set('month', activeMonth);
    window.history.replaceState({}, '', url.toString());
    render(plansByTrip);
  };

  prevButton?.addEventListener('click', () => syncMonth(-1));
  nextButton?.addEventListener('click', () => syncMonth(1));

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeUserTrips(
      user.uid,
      (items) => {
        trips = items;
        stopPlans();
        plansByTrip = {};

        if (trips.length === 0) {
          render({});
          return;
        }

        const stopCallbacks: Array<() => void> = [];

        trips.forEach((trip) => {
          stopCallbacks.push(
            subscribeTripPlans(trip.id, (plans) => {
              plansByTrip[trip.id] = plans;
              render(plansByTrip);
            }),
          );
        });

        stopPlans = () => stopCallbacks.forEach((stop) => stop());
      },
      () => {
        logTripsPermissionError(user);
        trips = [];
        stopPlans();
        plansByTrip = {};
        render({});
        renderTripsPermissionError(locale);
      },
    );
  });
}
