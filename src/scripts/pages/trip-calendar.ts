import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { getCalendarGrid, getMonthCursor, getMonthKey, getMonthLabel } from '../../lib/app/format';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { ensureFirebaseReady, getCategoryLabel, getPageTranslator, getPlanStatusLabel, getWeekdayLabels } from './shared';

function renderWeekdays(locale: Locale, targetSelector: string) {
  const target = document.querySelector<HTMLElement>(targetSelector);

  if (!target) {
    return;
  }

  target.innerHTML = getWeekdayLabels(locale)
    .map((day) => `<span>${escapeHtml(day)}</span>`)
    .join('');
}

function renderCalendarGrid(locale: Locale, monthKey: string, plans: PlanRecord[]) {
  const [year, month] = monthKey.split('-').map(Number);
  const gridTarget = document.querySelector<HTMLElement>('[data-trip-calendar-grid]');
  const monthLabel = document.querySelector<HTMLElement>('[data-month-label]');
  const eventsTarget = document.querySelector<HTMLElement>('[data-calendar-events]');

  if (!gridTarget || !monthLabel || !eventsTarget) {
    return;
  }

  monthLabel.textContent = getMonthLabel(locale, year, month - 1);

  const planMap = plans.reduce<Record<string, PlanRecord[]>>((accumulator, plan) => {
    if (!plan.date || !plan.date.startsWith(monthKey)) {
      return accumulator;
    }

    accumulator[plan.date] ??= [];
    accumulator[plan.date].push(plan);
    return accumulator;
  }, {});
  const { firstWeekday, grid } = getCalendarGrid(year, month - 1);
  const leading = Array.from({ length: firstWeekday }, () => '<div class="min-h-[7.5rem] rounded-[var(--radius-md)] border border-transparent"></div>').join('');

  gridTarget.innerHTML =
    leading +
    grid
      .map((day) => {
        const plansForDay = planMap[day.key] ?? [];

        return `
          <article class="min-h-[7.5rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-black text-[var(--color-text)]">${day.day}</p>
              <span class="text-xs text-[var(--color-text-soft)]">${plansForDay.length}</span>
            </div>
            <div class="mt-3 grid gap-2">
              ${plansForDay
                .slice(0, 3)
                .map(
                  (plan) => `
                    <a class="rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] px-2 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)]" href="${getAppUrl(locale, 'plan', { trip: new URL(window.location.href).searchParams.get('trip') ?? '', plan: plan.id })}">
                      ${escapeHtml(plan.time ?? '--:--')} · ${escapeHtml(plan.name)}
                    </a>
                  `,
                )
                .join('')}
            </div>
          </article>
        `;
      })
      .join('');

  const datedPlans = plans.filter((plan) => plan.date?.startsWith(monthKey));
  const unscheduledPlans = plans.filter((plan) => !plan.date);

  eventsTarget.innerHTML =
    datedPlans
      .map(
        (plan) => `
          <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p class="text-sm font-semibold text-[var(--color-text-soft)]">${escapeHtml(plan.date ?? '')} ${escapeHtml(plan.time ?? '')}</p>
            <h3 class="mt-2 text-lg font-bold">${escapeHtml(plan.name)}</h3>
            <p class="mt-2 text-sm text-[var(--color-text-muted)]">${escapeHtml(getCategoryLabel(locale, plan.category))} · ${escapeHtml(getPlanStatusLabel(locale, plan.status))}</p>
          </article>
        `,
      )
      .join('') +
    (unscheduledPlans.length
      ? `<article class="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-soft)]">${escapeHtml(getPageTranslator(locale)('calendar.unscheduledCount'))}: ${unscheduledPlans.length}</article>`
      : '');
}

export function mountTripCalendarPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const tripName = document.querySelector<HTMLElement>('[data-calendar-trip-name]');
  const prevButton = document.querySelector<HTMLButtonElement>('#calendar-prev-month');
  const nextButton = document.querySelector<HTMLButtonElement>('#calendar-next-month');
  const backLink = document.querySelector<HTMLAnchorElement>('#calendar-back-trip-link');
  let activeMonth = params.get('month') ?? getMonthKey(new Date().getFullYear(), new Date().getMonth());
  let plans: PlanRecord[] = [];

  if (!tripId) {
    if (tripName) {
      tripName.textContent = t('trip.missingId');
    }
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  renderWeekdays(locale, '[data-calendar-weekdays]');

  const syncMonth = (delta: number) => {
    const cursor = getMonthCursor(activeMonth);
    const nextDate = new Date(cursor.year, cursor.month + delta, 1);
    activeMonth = getMonthKey(nextDate.getFullYear(), nextDate.getMonth());
    const url = new URL(window.location.href);
    url.searchParams.set('trip', tripId);
    url.searchParams.set('month', activeMonth);
    window.history.replaceState({}, '', url.toString());
    renderCalendarGrid(locale, activeMonth, plans);
  };

  prevButton?.addEventListener('click', () => syncMonth(-1));
  nextButton?.addEventListener('click', () => syncMonth(1));

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip: TripRecord | null) => {
      if (tripName) {
        tripName.textContent = trip?.name ?? t('trip.notFound');
      }
    });

    subscribeTripPlans(tripId, (items) => {
      plans = items;
      renderCalendarGrid(locale, activeMonth, plans);
    });
  });
}
