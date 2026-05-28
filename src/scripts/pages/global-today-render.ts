import type { Locale } from '../../config/site';
import {
  defaultTodayFilters,
  getTodayItems,
  matchesTodayFilters,
  type TodayDataState,
  type TodayFilters,
  type TodayLocationState,
  type TodayPlanItem,
} from '../../lib/app/global-today';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance, formatFriendlyDate, formatPlanMoment } from '../../lib/app/format';
import { getPlanNameWithFlagsHtml } from '../../lib/app/plan-flags';
import type { PlanStatus, TripRecord } from '../../lib/app/models';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { getPlanLocationLabel } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import {
  getCategoryLabel,
  getCategoryOptions,
  getPageTranslator,
  getPlanStatusLabel,
  getPlanStatusTone,
} from './shared';
import { ensureListViewToggle } from './list-view-mode';

export function getTodayFilters(): TodayFilters {
  const search = document.querySelector<HTMLInputElement>('[data-today-filter-search]');
  const trip = document.querySelector<HTMLSelectElement>('[data-today-filter-trip]');
  const category = document.querySelector<HTMLSelectElement>('[data-today-filter-category]');
  const status = document.querySelector<HTMLSelectElement>('[data-today-filter-status]');
  const distance = document.querySelector<HTMLSelectElement>('[data-today-filter-distance]');
  const date = document.querySelector<HTMLInputElement>('[data-today-filter-date]');
  const includeWithoutDate = document.querySelector<HTMLInputElement>(
    '[data-today-filter-without-date]',
  );

  return {
    search: search?.value ?? defaultTodayFilters.search,
    tripId: trip?.value ?? defaultTodayFilters.tripId,
    category: category?.value ?? defaultTodayFilters.category,
    status: (status?.value as TodayFilters['status']) ?? defaultTodayFilters.status,
    maxDistanceKm: distance?.value ?? defaultTodayFilters.maxDistanceKm,
    date: date?.value ?? defaultTodayFilters.date,
    includeWithoutDate: includeWithoutDate?.checked ?? defaultTodayFilters.includeWithoutDate,
  };
}

function renderSelectOptions(locale: Locale, trips: TripRecord[]) {
  const t = getPageTranslator(locale);
  const tripSelect = document.querySelector<HTMLSelectElement>('[data-today-filter-trip]');
  const categorySelect = document.querySelector<HTMLSelectElement>('[data-today-filter-category]');

  if (tripSelect) {
    const currentValue = tripSelect.value || 'all';
    tripSelect.innerHTML = [
      `<option value="all">${escapeHtml(t('today.filters.allTrips'))}</option>`,
      ...trips.map(
        (trip) => `<option value="${escapeHtml(trip.id)}">${escapeHtml(trip.name)}</option>`,
      ),
    ].join('');
    tripSelect.value = trips.some((trip) => trip.id === currentValue) ? currentValue : 'all';
  }

  if (categorySelect) {
    const currentValue = categorySelect.value || 'all';
    categorySelect.innerHTML = [
      `<option value="all">${escapeHtml(t('trip.filters.allCategories'))}</option>`,
      ...getCategoryOptions(locale).map(
        (item) => `<option value="${item.value}">${escapeHtml(item.label)}</option>`,
      ),
    ].join('');
    categorySelect.value = currentValue;
  }
}

function getLocationStatusMessage(locale: Locale, state: TodayLocationState) {
  const t = getPageTranslator(locale);

  switch (state.status) {
    case 'locating':
      return t('today.location.loading');
    case 'ready':
      return t('today.location.ready');
    case 'imprecise':
      return t('today.location.imprecise');
    case 'unsupported':
      return t('geolocation.error.unsupported');
    case 'denied':
      return t('geolocation.error.denied');
    case 'timeout':
      return t('geolocation.error.timeout');
    case 'unavailable':
      return t('geolocation.error.unavailable');
    default:
      return '';
  }
}

function renderLocationState(locale: Locale, state: TodayLocationState) {
  const target = document.querySelector<HTMLElement>('[data-today-location-status]');
  const button = document.querySelector<HTMLButtonElement>('[data-today-location-action]');
  const distanceSelect = document.querySelector<HTMLSelectElement>('[data-today-filter-distance]');
  const distanceHint = document.querySelector<HTMLElement>('[data-today-distance-hint]');
  const label = getLocationStatusMessage(locale, state);
  const hasLocation = Boolean(state.location);

  if (button) {
    button.disabled = state.status === 'locating';
    button.setAttribute('aria-busy', state.status === 'locating' ? 'true' : 'false');
  }

  if (distanceSelect) {
    distanceSelect.disabled = !hasLocation;
    if (!hasLocation) {
      distanceSelect.value = 'all';
    }
  }

  if (distanceHint) {
    distanceHint.textContent = hasLocation
      ? getPageTranslator(locale)('today.filters.distanceReady')
      : getPageTranslator(locale)('today.filters.distanceHint');
  }

  if (!target) {
    return;
  }

  target.hidden = !label;
  target.textContent = label;
  target.dataset.tone =
    state.status === 'ready'
      ? 'success'
      : state.status === 'imprecise'
        ? 'warning'
        : state.status === 'idle'
          ? 'info'
          : 'danger';
}

function renderSummary(
  locale: Locale,
  visibleItems: TodayPlanItem[],
  allItems: TodayPlanItem[],
  trips: TripRecord[],
  dataState: TodayDataState,
) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-today-summary]');

  if (!target) {
    return;
  }

  const loadingLabel = dataState.tripsLoaded
    ? dataState.loadingTripIds.length > 0
      ? t('today.summary.loadingPlans').replace('{count}', String(dataState.loadingTripIds.length))
      : ''
    : t('common.loading');
  const label = t('today.summary')
    .replace('{plans}', String(visibleItems.length))
    .replace('{total}', String(allItems.length))
    .replace('{trips}', String(trips.length));

  target.innerHTML = `
    <div class="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)]">
      <p>${escapeHtml(label)}</p>
      ${loadingLabel ? `<p class="text-xs text-[var(--color-text-soft)]">${escapeHtml(loadingLabel)}</p>` : ''}
    </div>
  `;
}

function renderStatusPill(locale: Locale, status: PlanStatus) {
  return `<span class="status-pill inline-flex h-7 shrink-0 items-center px-3 text-xs" data-tone="${getPlanStatusTone(status)}">${escapeHtml(getPlanStatusLabel(locale, status))}</span>`;
}

function renderPlanCard(locale: Locale, item: TodayPlanItem) {
  const t = getPageTranslator(locale);
  const categoryLabel = getCategoryLabel(locale, item.plan.category);
  const moment = formatPlanMoment(item.plan, locale);
  const dateLabel = moment || t('today.card.noDate');
  const locationLabel = getPlanLocationLabel(item.plan) || t('today.card.noLocation');
  const distanceLabel =
    typeof item.distanceKm === 'number' ? formatDistance(item.distanceKm, locale) : '';
  const planUrl = getAppUrl(locale, 'plan', { trip: item.trip.id, plan: item.plan.id });
  const tripUrl = getAppUrl(locale, 'trip', { trip: item.trip.id });
  const tripDateRange = `${formatFriendlyDate(item.trip.startDate, locale)} - ${formatFriendlyDate(item.trip.endDate, locale)}`;

  return `
    <article class="app-card-shell min-w-0 overflow-hidden" data-list-card>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">${escapeHtml(item.trip.name)}</p>
          <p class="mt-1 text-xs font-semibold text-[var(--color-text-soft)]">${escapeHtml(tripDateRange)}</p>
          <a class="mt-2 block min-w-0" href="${planUrl}">
            <h3 class="min-w-0 text-lg font-black leading-tight text-[var(--color-text)]">${getPlanNameWithFlagsHtml(item.plan, t)}</h3>
          </a>
        </div>
        <span data-list-detail>${renderStatusPill(locale, item.plan.status)}</span>
      </div>
      ${item.plan.description ? `<p class="mt-3 text-sm text-[var(--color-text-muted)]" data-list-detail>${escapeHtml(item.plan.description)}</p>` : ''}
      <dl class="mt-4 grid gap-3 text-sm text-[var(--color-text-muted)] sm:grid-cols-2" data-list-detail>
        <div>
          <dt class="font-bold text-[var(--color-text)]">${escapeHtml(t('trip.planCard.type'))}</dt>
          <dd class="mt-1 flex items-center gap-2">
            <span style="${getPlanCategoryDotStyle(item.plan.category)}" aria-hidden="true"></span>
            <span>${escapeHtml(categoryLabel)}</span>
          </dd>
        </div>
        <div>
          <dt class="font-bold text-[var(--color-text)]">${escapeHtml(t('trip.planCard.date'))}</dt>
          <dd class="mt-1">${escapeHtml(dateLabel)}</dd>
        </div>
        <div>
          <dt class="font-bold text-[var(--color-text)]">${escapeHtml(t('today.card.location'))}</dt>
          <dd class="mt-1">${escapeHtml(locationLabel)}</dd>
        </div>
        <div>
          <dt class="font-bold text-[var(--color-text)]">${escapeHtml(t('trip.planCard.distance'))}</dt>
          <dd class="mt-1">${distanceLabel ? escapeHtml(distanceLabel) : escapeHtml(t('today.card.distanceUnavailable'))}</dd>
        </div>
      </dl>
      <div class="mt-5 flex flex-wrap gap-2">
        <a class="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${planUrl}">
          ${escapeHtml(t('today.card.openPlan'))}
        </a>
        <a class="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${tripUrl}">
          ${escapeHtml(t('calendar.openTrip'))}
        </a>
      </div>
    </article>
  `;
}

function renderPlanSection(locale: Locale, title: string, items: TodayPlanItem[]) {
  if (items.length === 0) {
    return '';
  }

  return `
    <section class="grid gap-4" aria-label="${escapeHtml(title)}">
      <h2 class="text-xl font-black text-[var(--color-text)]">${escapeHtml(title)}</h2>
      <div class="grid gap-4">
        ${items.map((item) => renderPlanCard(locale, item)).join('')}
      </div>
    </section>
  `;
}

function renderEmpty(locale: Locale, key: string) {
  return `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(getPageTranslator(locale)(key))}</article>`;
}

function renderList(
  locale: Locale,
  allItems: TodayPlanItem[],
  visibleItems: TodayPlanItem[],
  trips: TripRecord[],
  dataState: TodayDataState,
) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-today-list]');

  if (!target) {
    return;
  }

  if (!dataState.tripsLoaded) {
    target.innerHTML = renderEmpty(locale, 'common.loading');
    return;
  }

  ensureListViewToggle(locale, target);

  if (trips.length === 0) {
    target.innerHTML = renderEmpty(locale, 'today.empty.trips');
    return;
  }

  if (allItems.length === 0 && dataState.loadingTripIds.length > 0) {
    target.innerHTML = renderEmpty(locale, 'common.loading');
    return;
  }

  if (allItems.length === 0) {
    target.innerHTML = renderEmpty(locale, 'today.empty.plans');
    return;
  }

  if (visibleItems.length === 0) {
    target.innerHTML = renderEmpty(locale, 'today.empty.filters');
    return;
  }

  const located = visibleItems.filter((item) => typeof item.distanceKm === 'number');
  const unlocated = visibleItems.filter((item) => typeof item.distanceKm !== 'number');

  target.innerHTML = [
    renderPlanSection(locale, t('today.group.nearby'), located),
    renderPlanSection(locale, t('today.group.withoutLocation'), unlocated),
  ]
    .filter(Boolean)
    .join('');
}

export function renderMapPanelState(locale: Locale) {
  const details = document.querySelector<HTMLDetailsElement>('[data-today-map-panel]');
  const toggleState = document.querySelector<HTMLElement>('[data-today-map-toggle-state]');
  const toggleButton = document.querySelector<HTMLButtonElement>('[data-today-map-toggle]');

  if (!details || !toggleState || !toggleButton) {
    return;
  }

  const t = getPageTranslator(locale);
  const isOpen = details.open;

  toggleState.textContent = isOpen ? t('today.map.expanded') : t('today.map.collapsed');
  toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

export function renderGlobalTodayPage(
  locale: Locale,
  trips: TripRecord[],
  plansByTrip: Record<string, import('../../lib/app/models').PlanRecord[]>,
  locationState: TodayLocationState,
  dataState: TodayDataState,
) {
  const { items } = getTodayItems(trips, plansByTrip, locationState.location);
  const filters = getTodayFilters();
  const visibleItems = items.filter((item) => matchesTodayFilters(item, filters));

  renderSelectOptions(locale, trips);
  renderLocationState(locale, locationState);
  renderSummary(locale, visibleItems, items, trips, dataState);
  renderList(locale, items, visibleItems, trips, dataState);
  renderMapPanelState(locale);

  return { items, visibleItems };
}

export function renderGlobalTodayTripsError(locale: Locale) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-today-list]');

  if (!target) {
    return;
  }

  target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-5 py-8 text-center text-sm text-[var(--color-danger)]">${escapeHtml(t('firebase.permissionDenied'))}</article>`;
}
