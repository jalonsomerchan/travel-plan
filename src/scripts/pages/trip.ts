import type { Locale } from '../../config/site';
import {
  getAccommodationLocationLabel,
  getDistanceBetweenCoordinates,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance, formatPlanMoment } from '../../lib/app/format';
import {
  getGoogleMapsPlaceUrl,
  getGoogleMapsPlaceUrlFromCoordinates,
} from '../../lib/app/location-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
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
  syncTripShell,
} from './shared';

interface PlanFilters {
  search: string;
  category: string;
  status: string;
}

function filterPlans(plans: PlanRecord[], filters: PlanFilters) {
  const query = filters.search.trim().toLowerCase();

  return plans.filter((plan) => {
    const matchesQuery =
      !query ||
      [plan.name, plan.description, plan.locationName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    const matchesCategory = filters.category === 'all' || plan.category === filters.category;
    const matchesStatus = filters.status === 'all' || plan.status === filters.status;

    return matchesQuery && matchesCategory && matchesStatus;
  });
}

function getAccommodationDistanceLabel(locale: Locale, trip: TripRecord | null, plan: PlanRecord) {
  const t = getPageTranslator(locale);

  if (!trip?.accommodation || !hasPlanLocation(plan) || !hasAccommodationLocation(trip.accommodation)) {
    return '';
  }

  const distanceKm = getDistanceBetweenCoordinates(
    trip.accommodation.locationLat,
    trip.accommodation.locationLng,
    plan.locationLat,
    plan.locationLng,
  );

  return `${t('accommodation.distanceLabel')}: ${formatDistance(distanceKm, locale)}`;
}

function renderPlans(locale: Locale, tripId: string, trip: TripRecord | null, plans: PlanRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-plan-list]');
  const t = getPageTranslator(locale);
  if (!target) return;
  if (plans.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.plansEmpty'))}</article>`;
    return;
  }
  target.innerHTML = plans.map((plan) => `
    <a class="app-card-shell" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
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
      ${getAccommodationDistanceLabel(locale, trip, plan) ? `<p class="mt-2 text-sm font-semibold text-[var(--color-primary)]">${escapeHtml(getAccommodationDistanceLabel(locale, trip, plan))}</p>` : ''}
    </a>
  `).join('');
}

export function mountTripPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const calendarLink = document.querySelector<HTMLAnchorElement>('#trip-calendar-link');
  const mapLink = document.querySelector<HTMLAnchorElement>('#trip-map-link');
  const editLink = document.querySelector<HTMLAnchorElement>('#trip-edit-link');
  const accommodationLink = document.querySelector<HTMLAnchorElement>('#trip-accommodation-link');
  const accommodationMapsLink = document.querySelector<HTMLAnchorElement>('#trip-accommodation-maps-link');
  const membersLink = document.querySelector<HTMLAnchorElement>('#trip-members-link');
  const createPlanLink = document.querySelector<HTMLAnchorElement>('#trip-create-plan-link');
  const createPlanInlineLink = document.querySelector<HTMLAnchorElement>('#trip-create-plan-inline-link');
  const searchInput = document.querySelector<HTMLInputElement>('[data-plan-filter-search]');
  const categorySelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-category]');
  const statusSelect = document.querySelector<HTMLSelectElement>('[data-plan-filter-status]');
  const t = getPageTranslator(locale);
  let allPlans: PlanRecord[] = [];
  let currentTrip: TripRecord | null = null;
  const filters: PlanFilters = { search: '', category: 'all', status: 'all' };
  if (!tripId) {
    setAppShellTitle(t('trip.missingId'));
    setAppShellDescription('');
    setAppShellMeta([]);
    return;
  }
  if (!ensureFirebaseReady(locale)) return;
  if (calendarLink) calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  if (mapLink) mapLink.href = getAppUrl(locale, 'map', { trip: tripId });
  if (editLink) editLink.href = getAppUrl(locale, 'trip-edit', { trip: tripId });
  if (accommodationLink) accommodationLink.href = getAppUrl(locale, 'trip-accommodation', { trip: tripId });
  if (accommodationMapsLink) accommodationMapsLink.hidden = true;
  if (membersLink) membersLink.href = getAppUrl(locale, 'trip-members', { trip: tripId });
  if (createPlanLink) createPlanLink.href = getAppUrl(locale, 'plan-create', { trip: tripId });
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

  const syncPlans = () => {
    renderPlans(locale, tripId, currentTrip, filterPlans(allPlans, filters));
  };

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
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      if (trip) {
        currentTrip = trip;
        syncTripShell(locale, trip);
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
          accommodationMapsLink.rel = mapUrl ? 'noreferrer' : '';
        }
        syncPlans();
      } else {
        currentTrip = null;
        setAppShellTitle(t('trip.notFound'));
        setAppShellDescription('');
        setAppShellMeta([]);
      }
    });
    subscribeTripPlans(tripId, (plans) => {
      allPlans = plans;
      syncPlans();
    });
  });
}
