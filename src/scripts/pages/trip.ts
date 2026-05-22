import type { Locale } from '../../config/site';
import {
  getDistanceBetweenCoordinates,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance, formatFriendlyDate, formatPlanMoment } from '../../lib/app/format';
import {
  getGoogleMapsPlaceUrl,
  getGoogleMapsPlaceUrlFromCoordinates,
} from '../../lib/app/location-links';
import type { PlanStatus } from '../../lib/app/models';
import { getPlanFlagsHtml } from '../../lib/app/plan-flags';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { hasPlanLocation } from '../../lib/app/plan-location';
import type { ChecklistItemRecord, PlanRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import {
  fetchMergedWeatherDataset,
  getTripWeatherCardDates,
  getTripWeatherRequirement,
  getWeatherIconSvg,
  getWeatherLabelKeyForCode,
  isForecastAvailable,
} from '../../lib/app/weather';
import { subscribeTripChecklistItems } from '../../lib/firebase/checklists';
import { deletePlan, subscribeTripPlans, updatePlan } from '../../lib/firebase/plans';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeChildTrips, subscribeTrip } from '../../lib/firebase/trips';
import {
  openPlanAiTourGenerator,
  renderPlanAiTourGenerateMenuAction,
} from './plan-ai-tour-generator';
import {
  hasPlanAiGuide,
  openPlanAiGuidePlayer,
  renderPlanAiGuideIndicator,
  renderPlanAiGuideMenuAction,
  stopPlanAiGuidePlayer,
} from './plan-ai-guide-player';
import {
  ensureFirebaseReady,
  getCategoryLabel,
  getCategoryOptions,
  getPageTranslator,
  getPlanStatusLabel,
  getPlanStatusOptions,
  getPlanStatusTone,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  setNavigationLinkHidden,
  setTripContextName,
  syncTripParentNavigation,
  syncTripNavigation,
  syncTripShell,
} from './shared';
import { renderMiniTrips } from './trip-mini-trips';

interface PlanFilters {
  search: string;
  category: string;
  status: string;
  paid: 'all' | 'yes' | 'no';
  booked: 'all' | 'yes' | 'no';
  date: 'all' | 'today' | 'no-date';
  important: 'all' | 'yes' | 'no';
  guide: 'all' | 'yes' | 'no';
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

type GeolocationErrorKey = 'geolocation.error.unsupported' | 'geolocation.error.unavailable';

interface GeolocationState {
  isLoading: boolean;
  errorKey: GeolocationErrorKey | null;
  location: UserLocation | null;
}

function renderPlanStatusIndicator(locale: Locale, status: PlanStatus) {
  const label = getPlanStatusLabel(locale, status);
  const tooltip = getPageTranslator(locale)('trip.planCard.statusTooltip').replace('{status}', label);

  return `<span aria-label="${escapeHtml(tooltip)}" class="status-pill inline-flex h-7 shrink-0 items-center px-3 text-xs" data-tone="${getPlanStatusTone(status)}" title="${escapeHtml(tooltip)}">${escapeHtml(label)}</span>`;
}

function matchesBooleanFilter(value: boolean, filter: PlanFilters['paid']) {
  if (filter === 'all') {
    return true;
  }

  return filter === 'yes' ? value : !value;
}

function getLocalTodayIsoDate() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localTime.toISOString().slice(0, 10);
}

function filterPlans(plans: PlanRecord[], filters: PlanFilters) {
  const query = filters.search.trim().toLowerCase();
  const today = getLocalTodayIsoDate();

  return plans.filter((plan) => {
    const matchesQuery =
      !query ||
      [plan.name, plan.description, plan.locationName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    const matchesCategory = filters.category === 'all' || plan.category === filters.category;
    const matchesStatus = filters.status === 'all' || plan.status === filters.status;
    const matchesPaid = matchesBooleanFilter(plan.isPaid, filters.paid);
    const matchesBooked = matchesBooleanFilter(plan.isBooked, filters.booked);
    const matchesImportant = matchesBooleanFilter(plan.isImportant, filters.important);
    const matchesGuide = matchesBooleanFilter(hasPlanAiGuide(plan), filters.guide);
    const matchesDate =
      filters.date === 'all' ||
      (filters.date === 'today' && plan.date === today) ||
      (filters.date === 'no-date' && !plan.date);

    return (
      matchesQuery &&
      matchesCategory &&
      matchesStatus &&
      matchesPaid &&
      matchesBooked &&
      matchesImportant &&
      matchesGuide &&
      matchesDate
    );
  });
}

function getAccommodationDistanceLabel(locale: Locale, trip: TripRecord | null, plan: PlanRecord) {
  if (!trip?.accommodation || !hasPlanLocation(plan) || !hasAccommodationLocation(trip.accommodation)) {
    return '';
  }

  const distanceKm = getDistanceBetweenCoordinates(
    trip.accommodation.locationLat,
    trip.accommodation.locationLng,
    plan.locationLat,
    plan.locationLng,
  );

  return formatDistance(distanceKm, locale);
}

function getCurrentLocationDistanceLabel(
  locale: Locale,
  userLocation: UserLocation | null,
  plan: PlanRecord,
) {
  if (!userLocation || !hasPlanLocation(plan)) {
    return '';
  }

  const distanceKm = getDistanceBetweenCoordinates(
    userLocation.latitude,
    userLocation.longitude,
    plan.locationLat,
    plan.locationLng,
  );

  return formatDistance(distanceKm, locale);
}

function getPlanDateLabel(locale: Locale, plan: PlanRecord) {
  return formatPlanMoment(plan, locale) || getPageTranslator(locale)('trip.planCard.noDate');
}

function getPlanDistanceLabel(
  locale: Locale,
  trip: TripRecord | null,
  geolocation: GeolocationState,
  plan: PlanRecord,
) {
  return (
    getCurrentLocationDistanceLabel(locale, geolocation.location, plan) ||
    getAccommodationDistanceLabel(locale, trip, plan)
  );
}

function getStatusChangeMenuItems(locale: Locale, plan: PlanRecord) {
  const t = getPageTranslator(locale);
  const items: Array<{ label: string; status: PlanStatus }> = [];

  if (plan.status !== 'proposed') {
    items.push({ label: t('trip.planCard.markProposed'), status: 'proposed' });
  }

  if (plan.status !== 'pending') {
    items.push({ label: t('trip.planCard.markPending'), status: 'pending' });
  }

  if (plan.status !== 'visited') {
    items.push({ label: t('trip.planCard.markVisited'), status: 'visited' });
  }

  return items;
}

function syncCurrentLocationAction(plans: PlanRecord[], geolocation: GeolocationState) {
  const button = document.querySelector<HTMLButtonElement>('[data-current-location-action]');

  if (!button) return;

  button.hidden = !plans.some(hasPlanLocation);
  button.disabled = geolocation.isLoading;
  button.setAttribute('aria-busy', geolocation.isLoading ? 'true' : 'false');
}

function renderPlans(
  locale: Locale,
  tripId: string,
  trip: TripRecord | null,
  plans: PlanRecord[],
  geolocation: GeolocationState,
) {
  const target = document.querySelector<HTMLElement>('[data-plan-list]');
  const t = getPageTranslator(locale);
  syncCurrentLocationAction(plans, geolocation);
  if (!target) return;
  if (plans.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.plansEmpty'))}</article>`;
    return;
  }
  target.innerHTML = `
    ${geolocation.errorKey ? `<p class="text-sm text-[var(--color-text-soft)]">${escapeHtml(t(geolocation.errorKey))}</p>` : ''}
    ${plans.map((plan) => {
      const description = plan.description?.trim();
      const categoryLabel = getCategoryLabel(locale, plan.category);
      const dateLabel = getPlanDateLabel(locale, plan);
      const distanceLabel = getPlanDistanceLabel(locale, trip, geolocation, plan);
      const menuItems = getStatusChangeMenuItems(locale, plan);
      const planUrl = getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id });
      const planEditUrl = getAppUrl(locale, 'plan-edit', { trip: tripId, plan: plan.id });
      const flags = getPlanFlagsHtml(plan, t);
      const aiGuideIndicator = renderPlanAiGuideIndicator(locale, plan);

      return `
        <article class="app-card-shell min-w-0 overflow-hidden">
          <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
            <span class="plan-category-dot mt-2" style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
            <a class="min-w-0" href="${planUrl}">
              <h3 class="min-w-0 break-words text-lg font-bold leading-tight text-[var(--color-text)] [overflow-wrap:anywhere]">${escapeHtml(plan.name)}</h3>
            </a>
            <details class="app-actions-menu">
              <summary aria-label="${escapeHtml(t('trip.planCard.actions'))}" class="app-actions-menu-trigger" title="${escapeHtml(t('trip.planCard.actions'))}">
                ⋮
              </summary>
              <div class="app-actions-menu-panel">
                ${menuItems
                  .map(
                    (item) => `
                      <button class="app-actions-menu-link app-actions-menu-button" data-plan-status-action="${item.status}" data-plan-id="${escapeHtml(plan.id)}" type="button">
                        ${escapeHtml(item.label)}
                      </button>`,
                  )
                  .join('')}
                ${renderPlanAiGuideMenuAction(locale, plan)}
                ${renderPlanAiTourGenerateMenuAction(locale, plan)}
                <a class="app-actions-menu-link" href="${planEditUrl}">
                  ${escapeHtml(t('common.edit'))}
                </a>
                <button class="app-actions-menu-link app-actions-menu-button" data-plan-delete-action="${escapeHtml(plan.id)}" type="button">
                  ${escapeHtml(t('common.delete'))}
                </button>
              </div>
            </details>
          </div>
          <div class="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p class="min-w-0 break-words text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)] [overflow-wrap:anywhere]">${escapeHtml(t('trip.planCard.type'))} · ${escapeHtml(categoryLabel)}</p>
            ${renderPlanStatusIndicator(locale, plan.status)}
          </div>
          ${(flags || aiGuideIndicator)
            ? `<div class="mt-2 flex min-w-0 flex-wrap items-center gap-2">${flags}${aiGuideIndicator}</div>`
            : ''}
          ${description ? `<p class="mt-3 max-w-full break-words text-sm text-[var(--color-text-muted)] [overflow-wrap:anywhere]">${escapeHtml(description)}</p>` : ''}
          <div class="mt-3 grid min-w-0 gap-x-4 gap-y-1 text-sm text-[var(--color-text-soft)] sm:grid-cols-2">
            <p class="min-w-0 break-words [overflow-wrap:anywhere]"><span class="font-semibold text-[var(--color-text-muted)]">${escapeHtml(t('trip.planCard.date'))}</span> | ${escapeHtml(dateLabel)}</p>
            <p class="min-w-0 break-words [overflow-wrap:anywhere]"><span class="font-semibold text-[var(--color-text-muted)]">${escapeHtml(t('trip.planCard.distance'))}:</span> ${escapeHtml(distanceLabel || '-')}</p>
          </div>
        </article>
      `;
    }).join('')}
  `;
}

function renderChecklistNotice(locale: Locale, tripId: string, items: ChecklistItemRecord[]) {
  const target = document.querySelector<HTMLAnchorElement>('[data-trip-checklist-notice]');
  const t = getPageTranslator(locale);

  if (!target) {
    return;
  }

  const pendingCount = items.filter((item) => item.status === 'pending').length;

  if (pendingCount === 0) {
    target.hidden = true;
    target.innerHTML = '';
    return;
  }

  const label =
    pendingCount === 1
      ? t('tripChecklist.pendingNotice.one')
      : t('tripChecklist.pendingNotice.other').replace('{count}', String(pendingCount));

  target.hidden = false;
  target.href = getAppUrl(locale, 'trip-checklist', { trip: tripId });
  target.innerHTML = `
    <span class="mt-0.5 shrink-0" aria-hidden="true">!</span>
    <span class="min-w-0 flex-1 break-words">${escapeHtml(label)}</span>
  `;
}

function formatTemperature(value: number | null, unit: string) {
  if (value === null) {
    return '--';
  }

  return `${Math.round(value)}${unit}`;
}

function getWeatherCardShell(actionable: boolean, href: string, content: string) {
  const classes =
    'app-card-shell trip-weather-card rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]';

  if (!actionable) {
    return `<article class="${classes}">${content}</article>`;
  }

  return `<a class="${classes}" href="${href}">${content}</a>`;
}

function renderWeatherCardState(
  locale: Locale,
  tripId: string,
  trip: TripRecord | null,
  state: { actionable: boolean; body: string },
) {
  const target = document.querySelector<HTMLElement>('[data-trip-weather-card]');

  if (!target || !trip) {
    return;
  }

  const detailUrl = getAppUrl(locale, 'trip-weather', { trip: tripId });

  target.innerHTML = getWeatherCardShell(
    state.actionable,
    detailUrl,
    `
      <div class="trip-weather-card-inner">
        <div class="trip-weather-card-copy">
          ${state.body}
        </div>
        <span class="trip-weather-card-arrow" aria-hidden="true">${state.actionable ? '›' : ''}</span>
      </div>
    `,
  );
}

function renderMissingWeatherCard(locale: Locale, tripId: string, trip: TripRecord | null) {
  const t = getPageTranslator(locale);

  renderWeatherCardState(locale, tripId, trip, {
    actionable: false,
    body: `
      <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
      <p class="trip-weather-card-helper">${escapeHtml(t('weather.card.missingConfig'))}</p>
    `,
  });
}

function renderPastWeatherCard(locale: Locale, tripId: string, trip: TripRecord | null) {
  const t = getPageTranslator(locale);

  renderWeatherCardState(locale, tripId, trip, {
    actionable: true,
    body: `
      <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
      <p class="trip-weather-card-helper">${escapeHtml(t('weather.card.viewHistory'))}</p>
    `,
  });
}

function renderUnavailableForecastCard(locale: Locale, tripId: string, trip: TripRecord | null) {
  const t = getPageTranslator(locale);

  renderWeatherCardState(locale, tripId, trip, {
    actionable: true,
    body: `
      <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
      <p class="trip-weather-card-helper">${escapeHtml(t('weather.card.availableLater'))}</p>
    `,
  });
}

function renderWeatherSummaryCard(
  locale: Locale,
  tripId: string,
  trip: TripRecord | null,
  dates: string[],
  dataset: Awaited<ReturnType<typeof fetchMergedWeatherDataset>>,
) {
  const t = getPageTranslator(locale);
  const days = dates
    .map((date) => dataset.daily.find((entry) => entry.date === date))
    .filter(Boolean);

  if (days.length === 0) {
    renderUnavailableForecastCard(locale, tripId, trip);
    return;
  }

  renderWeatherCardState(locale, tripId, trip, {
    actionable: true,
    body: `
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
          <p class="trip-weather-card-helper">${escapeHtml(
            dates.length > 1 ? t('weather.card.todayAndTomorrow') : t('weather.card.firstDay'),
          )}</p>
        </div>
      </div>
      <div class="trip-weather-card-days">
        ${days
          .map((day) => {
            const label = t(getWeatherLabelKeyForCode(day.weatherCode));
            return `
              <article class="trip-weather-day-row">
                <div class="trip-weather-day-icon">
                  ${getWeatherIconSvg(day.weatherCode, true, label)}
                </div>
                <div class="trip-weather-day-copy">
                  <p class="trip-weather-day-label">${escapeHtml(formatFriendlyDate(day.date, locale))}</p>
                  <div class="trip-weather-day-meta">
                    <p class="trip-weather-day-summary">${escapeHtml(label)}</p>
                    <div class="trip-weather-day-temperatures trip-weather-day-temperatures--inline">
                      <strong>${escapeHtml(formatTemperature(day.temperatureMax, dataset.temperatureUnit))}</strong>
                      <span aria-hidden="true">|</span>
                      <em>${escapeHtml(formatTemperature(day.temperatureMin, dataset.temperatureUnit))}</em>
                    </div>
                  </div>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `,
  });
}

export function mountTripPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const calendarLink = document.querySelector<HTMLAnchorElement>('#trip-calendar-link');
  const mapLink = document.querySelector<HTMLAnchorElement>('#trip-map-link');
  const editLink = document.querySelector<HTMLAnchorElement>('#trip-edit-link');
  const checklistLink = document.querySelector<HTMLAnchorElement>('#trip-checklist-link');
  const luggageLink = document.querySelector<HTMLAnchorElement>('#trip-luggage-link');
  const accommodationLink = document.querySelector<HTMLAnchorElement>('#trip-accommodation-link');
  const accommodationMapsLink = document.querySelector<HTMLAnchorElement>('#trip-accommodation-maps-link');
  const membersLink = document.querySelector<HTMLAnchorElement>('#trip-members-link');
  const aiLink = document.querySelector<HTMLAnchorElement>('#trip-ai-link');
  const createPlanLink = document.querySelector<HTMLAnchorElement>('#trip-create-plan-link');
  const createMiniTripMenuLink = document.querySelector<HTMLAnchorElement>('#trip-create-mini-trip-menu-link');
  const aiInlineLink = document.querySelector<HTMLAnchorElement>('#trip-ai-inline-link');
  const createPlanInlineLink = document.querySelector<HTMLAnchorElement>('#trip-create-plan-inline-link');
  const tripTabs = document.querySelector<HTMLElement>('[data-trip-tabs]');
  const tripTabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-trip-tab]'));
  const miniTripsSection = document.querySelector<HTMLElement>('[data-mini-trips-section]');
  const planPanel = document.querySelector<HTMLElement>('[data-trip-panel="plans"]');
  const miniTripsPanel = document.querySelector<HTMLElement>('[data-trip-panel="mini-trips"]');
  const currentLocationButton = document.querySelector<HTMLButtonElement>('[data-current-location-action]');
  const planList = document.querySelector<HTMLElement>('[data-plan-list]');
  const searchInput = document.querySelector<HTMLInputElement>('[data-plan-filter-search]');
  const categorySelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-category]');
  const statusSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-status]');
  const paidSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-paid]');
  const bookedSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-booked]');
  const dateSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-date]');
  const importantSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-important]');
  const guideSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-guide]');
  const filtersToggle = document.querySelector<HTMLButtonElement>('[data-plan-filters-toggle]');
  const filtersForm = document.querySelector<HTMLFormElement>('[data-plan-filters]');
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  const miniTripChecklistSubscriptions = createSubscriptionScope();
  let allPlans: PlanRecord[] = [];
  let currentTrip: TripRecord | null = null;
  let currentMiniTrips: TripRecord[] = [];
  let currentChecklistItems: ChecklistItemRecord[] = [];
  let parentLookupToken = 0;
  let weatherRequestId = 0;
  let activeTab: 'plans' | 'mini-trips' = 'plans';
  const geolocation: GeolocationState = { isLoading: false, errorKey: null, location: null };
  const miniTripChecklistItems = new Map<string, ChecklistItemRecord[]>();
  const filters: PlanFilters = {
    search: '',
    category: 'all',
    status: 'all',
    paid: 'all',
    booked: 'all',
    date: 'all',
    important: 'all',
    guide: 'all',
  };
  if (!tripId) {
    setTripContextName('');
    setAppShellTitle(t('trip.missingId'));
    setAppShellDescription('');
    setAppShellMeta([]);
    return;
  }
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (calendarLink) calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  if (mapLink) mapLink.href = getAppUrl(locale, 'map', { trip: tripId });
  if (editLink) editLink.href = getAppUrl(locale, 'trip-edit', { trip: tripId });
  if (checklistLink) checklistLink.href = getAppUrl(locale, 'trip-checklist', { trip: tripId });
  if (luggageLink) luggageLink.href = getAppUrl(locale, 'trip-luggage', { trip: tripId });
  if (accommodationLink) accommodationLink.href = getAppUrl(locale, 'trip-accommodation', { trip: tripId });
  if (accommodationMapsLink) accommodationMapsLink.hidden = true;
  if (membersLink) membersLink.href = getAppUrl(locale, 'trip-members', { trip: tripId });
  if (aiLink) aiLink.href = getAppUrl(locale, 'trip-plan-suggestions', { trip: tripId });
  if (createPlanLink) createPlanLink.href = getAppUrl(locale, 'plan-create', { trip: tripId });
  if (createMiniTripMenuLink) createMiniTripMenuLink.href = getAppUrl(locale, 'trip-create', { parent: tripId });
  if (aiInlineLink) aiInlineLink.href = getAppUrl(locale, 'trip-plan-suggestions', { trip: tripId });
  if (createPlanInlineLink) createPlanInlineLink.href = getAppUrl(locale, 'plan-create', { trip: tripId });
  if (categorySelect) {
    categorySelect.innerHTML += getCategoryOptions(locale)
      .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join('');
  }
  if (statusSelect) {
    statusSelect.innerHTML += getPlanStatusOptions(locale)
      .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join('');
  }
  filtersToggle?.addEventListener('click', () => {
    const isExpanded = filtersToggle.getAttribute('aria-expanded') === 'true';
    filtersToggle.setAttribute('aria-expanded', String(!isExpanded));
    filtersForm?.classList.toggle('hidden', isExpanded);
    filtersForm?.classList.toggle('grid', !isExpanded);
  });
  tripTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.tripTab;

      if (nextTab !== 'plans' && nextTab !== 'mini-trips') {
        return;
      }

      activeTab = nextTab;
      syncTripPanels();
    });
  });

  const syncPlans = () => {
    renderPlans(locale, tripId, currentTrip, filterPlans(allPlans, filters), geolocation);
  };

  const syncTripPanels = () => {
    const canShowMiniTripsTab = Boolean(currentTrip && !currentTrip.parentTripId && currentMiniTrips.length > 0);

    if (!canShowMiniTripsTab) {
      activeTab = 'plans';
    }

    if (tripTabs) {
      tripTabs.hidden = !canShowMiniTripsTab;
    }

    tripTabButtons.forEach((button) => {
      const isSelected = canShowMiniTripsTab && button.dataset.tripTab === activeTab;

      button.setAttribute('aria-selected', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });

    if (planPanel) {
      planPanel.hidden = canShowMiniTripsTab ? activeTab !== 'plans' : false;
    }

    if (miniTripsPanel) {
      miniTripsPanel.hidden = !canShowMiniTripsTab || activeTab !== 'mini-trips';
    }
  };

  const syncChecklistNotice = () => {
    renderChecklistNotice(locale, tripId, [
      ...currentChecklistItems,
      ...Array.from(miniTripChecklistItems.values()).flat(),
    ]);
  };

  const syncMiniTrips = () => {
    renderMiniTrips(locale, currentMiniTrips);
    syncTripPanels();
  };

  const syncParentNavigation = (trip: TripRecord | null) => {
    const fallbackHref = getAppUrl(locale, 'dashboard');

    if (!trip?.parentTripId) {
      syncTripParentNavigation(locale, null, fallbackHref);
      return;
    }

    const lookupToken = parentLookupToken + 1;
    parentLookupToken = lookupToken;

    void getTripOnce(trip.parentTripId)
      .then((parentTrip) => {
        if (lookupToken !== parentLookupToken) {
          return;
        }

        syncTripParentNavigation(
          locale,
          parentTrip ? { id: parentTrip.id, name: parentTrip.name } : null,
          fallbackHref,
        );
      })
      .catch(() => {
        if (lookupToken !== parentLookupToken) {
          return;
        }

        syncTripParentNavigation(locale, null, fallbackHref);
      });
  };

  const syncMiniTripChecklistSubscriptions = () => {
    miniTripChecklistSubscriptions.clear();
    miniTripChecklistItems.clear();

    currentMiniTrips.forEach((miniTrip) => {
      miniTripChecklistSubscriptions.add(
        subscribeTripChecklistItems(miniTrip.id, (items) => {
          miniTripChecklistItems.set(miniTrip.id, items);
          syncChecklistNotice();
        }),
      );
    });

    syncChecklistNotice();
  };

  const resetState = () => {
    allPlans = [];
    currentTrip = null;
    currentMiniTrips = [];
    currentChecklistItems = [];
    activeTab = 'plans';
    parentLookupToken += 1;
    miniTripChecklistItems.clear();
    syncMiniTrips();
    syncChecklistNotice();
    weatherRequestId += 1;
    geolocation.isLoading = false;
    geolocation.errorKey = null;
    geolocation.location = null;
    stopPlanAiGuidePlayer();
  };

  const syncWeatherCard = async () => {
    const trip = currentTrip;

    if (!trip) {
      return;
    }

    const weatherRequirement = getTripWeatherRequirement(trip);

    if (!weatherRequirement.ready) {
      renderMissingWeatherCard(locale, tripId, trip);
      return;
    }

    const cardState = getTripWeatherCardDates(trip);

    if (cardState.mode === 'past') {
      renderPastWeatherCard(locale, tripId, trip);
      return;
    }

    if (cardState.mode === 'missing') {
      renderMissingWeatherCard(locale, tripId, trip);
      return;
    }

    if (cardState.dates.length === 0 || !cardState.dates.some((date) => isForecastAvailable(date))) {
      renderUnavailableForecastCard(locale, tripId, trip);
      return;
    }

    const requestId = weatherRequestId + 1;
    weatherRequestId = requestId;
    renderWeatherCardState(locale, tripId, trip, {
      actionable: true,
      body: `
        <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
        <p class="trip-weather-card-helper">${escapeHtml(t('common.loading'))}</p>
      `,
    });

    try {
      const lastAvailableDate = cardState.dates.filter((date) => isForecastAvailable(date)).at(-1);

      if (!lastAvailableDate || typeof trip.locationLat !== 'number' || typeof trip.locationLng !== 'number') {
        renderUnavailableForecastCard(locale, tripId, trip);
        return;
      }

      const dataset = await fetchMergedWeatherDataset(
        trip.locationLat,
        trip.locationLng,
        cardState.dates[0],
        lastAvailableDate,
      );

      if (requestId !== weatherRequestId) {
        return;
      }

      renderWeatherSummaryCard(locale, tripId, trip, cardState.dates, dataset);
    } catch {
      if (requestId !== weatherRequestId) {
        return;
      }

      renderWeatherCardState(locale, tripId, trip, {
        actionable: true,
        body: `
          <h2 class="trip-weather-card-title">${escapeHtml(t('weather.card.title'))}</h2>
          <p class="trip-weather-card-helper">${escapeHtml(t('weather.card.error'))}</p>
        `,
      });
    }
  };

  const updateGeolocation = (nextState: Partial<GeolocationState>) => {
    Object.assign(geolocation, nextState);
    syncPlans();
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      updateGeolocation({ errorKey: 'geolocation.error.unsupported', isLoading: false });
      return;
    }

    updateGeolocation({ errorKey: null, isLoading: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateGeolocation({
          errorKey: null,
          isLoading: false,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      () =>
        updateGeolocation({
          errorKey: 'geolocation.error.unavailable',
          isLoading: false,
          location: null,
        }),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  };

  currentLocationButton?.addEventListener('click', requestCurrentLocation);
  searchInput?.addEventListener('input', () => {
    filters.search = searchInput.value;
    syncPlans();
  });
  categorySelect?.addEventListener('change', () => {
    filters.category = categorySelect.value;
    syncPlans();
  });
  statusSelect?.addEventListener('change', () => {
    filters.status = statusSelect.value;
    syncPlans();
  });
  paidSelect?.addEventListener('change', () => {
    filters.paid = paidSelect.value as PlanFilters['paid'];
    syncPlans();
  });
  bookedSelect?.addEventListener('change', () => {
    filters.booked = bookedSelect.value as PlanFilters['booked'];
    syncPlans();
  });
  dateSelect?.addEventListener('change', () => {
    filters.date = dateSelect.value as PlanFilters['date'];
    syncPlans();
  });
  importantSelect?.addEventListener('change', () => {
    filters.important = importantSelect.value as PlanFilters['important'];
    syncPlans();
  });
  guideSelect?.addEventListener('change', () => {
    filters.guide = guideSelect.value as PlanFilters['guide'];
    syncPlans();
  });

  window.addEventListener('pagehide', () => {
    stopPlanAiGuidePlayer();
    subscriptions.clear();
    miniTripChecklistSubscriptions.clear();
  }, { once: true });

  planList?.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const statusButton = target.closest<HTMLElement>('[data-plan-status-action]');

    if (statusButton) {
      const planId = statusButton.dataset.planId ?? '';
      const nextStatus = statusButton.dataset.planStatusAction as PlanStatus | undefined;
      const plan = allPlans.find((item) => item.id === planId);

      if (!planId || !nextStatus || !plan) {
        return;
      }

      try {
        await updatePlan(tripId, planId, { ...plan, status: nextStatus });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('trip.planCard.statusError'));
      }

      return;
    }

    const aiGuideButton = target.closest<HTMLElement>('[data-plan-ai-guide-action]');

    if (aiGuideButton) {
      const planId = aiGuideButton.dataset.planAiGuideAction ?? '';
      const plan = allPlans.find((item) => item.id === planId);

      if (plan && hasPlanAiGuide(plan)) {
        openPlanAiGuidePlayer(locale, plan);
      }

      return;
    }

    const aiTourGenerateButton = target.closest<HTMLElement>('[data-plan-ai-tour-generate-action]');

    if (aiTourGenerateButton) {
      const planId = aiTourGenerateButton.dataset.planAiTourGenerateAction ?? '';
      const plan = allPlans.find((item) => item.id === planId);

      if (plan && currentTrip) {
        openPlanAiTourGenerator(locale, currentTrip, plan, async (aiGuide) => {
          await updatePlan(tripId, plan.id, { ...plan, aiGuide });
          allPlans = allPlans.map((item) => (item.id === plan.id ? { ...item, aiGuide } : item));
          syncPlans();
        });
      }

      return;
    }

    const deleteButton = target.closest<HTMLElement>('[data-plan-delete-action]');

    if (!deleteButton) {
      return;
    }

    const planId = deleteButton.dataset.planDeleteAction ?? '';

    if (!planId || !window.confirm(t('plan.deleteConfirm'))) {
      return;
    }

    try {
      await deletePlan(tripId, planId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('plan.deleteError'));
    }
  });
  observeSession((user) => {
    subscriptions.clear();
    miniTripChecklistSubscriptions.clear();
    resetState();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        if (trip) {
          currentTrip = trip;
          syncTripShell(locale, trip);
          syncParentNavigation(trip);
          void syncWeatherCard();
          setNavigationLinkHidden('trip-luggage-link', !trip.memberIds.includes(user.uid));
          if (miniTripsSection) {
            miniTripsSection.hidden = Boolean(trip.parentTripId);
          }
          if (createMiniTripMenuLink) {
            createMiniTripMenuLink.hidden = Boolean(trip.parentTripId);
          }
          if (accommodationMapsLink) {
            const hasLocation = hasAccommodationLocation(trip.accommodation);
            const mapUrl = hasLocation
              ? getGoogleMapsPlaceUrlFromCoordinates(
                  trip.accommodation.locationLat,
                  trip.accommodation.locationLng,
                )
              : trip.accommodation?.locationName
                ? getGoogleMapsPlaceUrl(trip.accommodation.locationName)
                : '';

            accommodationMapsLink.href = mapUrl || getAppUrl(locale, 'trip-accommodation', { trip: tripId });
            accommodationMapsLink.hidden = !mapUrl;
            accommodationMapsLink.target = mapUrl ? '_blank' : '';
            accommodationMapsLink.rel = mapUrl ? 'noopener noreferrer' : '';
          }
          syncTripPanels();
          syncPlans();
        } else {
          currentTrip = null;
          syncParentNavigation(null);
          setNavigationLinkHidden('trip-luggage-link', true);
          setTripContextName('');
          setAppShellTitle(t('trip.notFound'));
          setAppShellDescription('');
          setAppShellMeta([]);
          syncTripPanels();
        }
      }),
    );

    subscriptions.add(
      subscribeTripPlans(tripId, (plans) => {
        allPlans = plans;
        syncPlans();
      }),
    );

    subscriptions.add(
      subscribeTripChecklistItems(tripId, (items) => {
        currentChecklistItems = items;
        syncChecklistNotice();
      }),
    );

    subscriptions.add(
      subscribeChildTrips(tripId, (miniTrips) => {
        currentMiniTrips = miniTrips;
        syncMiniTrips();
        syncMiniTripChecklistSubscriptions();
      }),
    );
  });
}
