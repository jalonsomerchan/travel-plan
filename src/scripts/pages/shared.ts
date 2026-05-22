import { type Locale } from '../../config/site';
import { useTranslations } from '../../i18n/ui';
import { getAccommodationLocationLabel } from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { withBasePath } from '../../utils/paths';
import {
  checklistItemStatusValues,
  planCategoryValues,
  planStatusValues,
  tripMemberRoles,
  tripStatusValues,
  type ChecklistItemStatus,
  type PlanRecord,
  type PlanCategory,
  type PlanStatus,
  type TripRecord,
  type TripMemberRole,
  type TripStatus,
} from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { isFirebaseConfigured, getMissingFirebaseConfig } from '../../lib/firebase/config';
import { signOutSession } from '../../lib/firebase/session';

export function getPageTranslator(locale: Locale) {
  return useTranslations(locale);
}

export function ensureFirebaseReady(locale: Locale) {
  const t = getPageTranslator(locale);
  const state = document.querySelector<HTMLElement>('[data-firebase-state]');

  if (isFirebaseConfigured()) {
    if (state) {
      state.textContent = t('firebase.configReady');
      state.dataset.tone = 'success';
    }

    return true;
  }

  if (state) {
    state.textContent = `${t('firebase.configMissing')} ${getMissingFirebaseConfig().join(', ')}`;
    state.dataset.tone = 'danger';
  }

  return false;
}

export function revealAppShell() {
  const loading = document.querySelector<HTMLElement>('[data-app-loading]');
  const content = document.querySelector<HTMLElement>('[data-app-content]');

  loading?.remove();

  if (content) {
    content.hidden = false;
    content.removeAttribute('data-app-content');
  }
}

export function redirectTo(locale: Locale, view: Parameters<typeof getAppUrl>[1], params = {}) {
  window.location.href = getAppUrl(locale, view, params);
}

export function redirectHome(locale: Locale) {
  window.location.href = locale === 'es' ? withBasePath('/') : withBasePath(`/${locale}/`);
}

export function bindSignOut(button: HTMLElement | null, locale: Locale) {
  if (!button) {
    return;
  }

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    await signOutSession();
    redirectHome(locale);
  });
}

export function getTripStatusLabel(locale: Locale, status: TripStatus) {
  return getPageTranslator(locale)(`status.trip.${status}`);
}

export function getPlanStatusLabel(locale: Locale, status: PlanStatus) {
  return getPageTranslator(locale)(`status.plan.${status}`);
}

export function getChecklistStatusLabel(locale: Locale, status: ChecklistItemStatus) {
  return getPageTranslator(locale)(`status.checklist.${status}`);
}

export function getCategoryLabel(locale: Locale, category: PlanCategory) {
  return getPageTranslator(locale)(`category.${category}`);
}

export function getRoleLabel(locale: Locale, role: TripMemberRole) {
  return getPageTranslator(locale)(`role.${role}`);
}

export function getTripStatusTone(status: TripStatus) {
  if (status === 'visited') {
    return 'success';
  }

  if (status === 'booked') {
    return 'primary';
  }

  return 'warning';
}

export function getPlanStatusTone(status: PlanStatus) {
  if (status === 'visited') {
    return 'success';
  }

  if (status === 'proposed') {
    return 'warning';
  }

  if (status === 'discarded') {
    return 'danger';
  }

  return 'primary';
}

export function getChecklistStatusTone(status: ChecklistItemStatus) {
  return status === 'completed' ? 'success' : 'warning';
}

export function getWeekdayLabels(locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 0, 5 + index);
    return formatter.format(date);
  });
}

export function disableForm(form: HTMLFormElement | null, disabled: boolean) {
  if (!form) {
    return;
  }

  Array.from(form.elements).forEach((element) => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLButtonElement
    ) {
      element.disabled = disabled;
    }
  });
}

export function getTripStatusOptions(locale: Locale) {
  return tripStatusValues.map((status) => ({ value: status, label: getTripStatusLabel(locale, status) }));
}

export function getPlanStatusOptions(locale: Locale) {
  return planStatusValues.map((status) => ({ value: status, label: getPlanStatusLabel(locale, status) }));
}

export function getChecklistStatusOptions(locale: Locale) {
  return checklistItemStatusValues.map((status) => ({
    value: status,
    label: getChecklistStatusLabel(locale, status),
  }));
}

export function getCategoryOptions(locale: Locale) {
  return planCategoryValues.map((category) => ({ value: category, label: getCategoryLabel(locale, category) }));
}

export function getRoleOptions(locale: Locale) {
  return tripMemberRoles.map((role) => ({ value: role, label: getRoleLabel(locale, role) }));
}

export function formatTripDateRange(locale: Locale, trip: Pick<TripRecord, 'startDate' | 'endDate'>) {
  return formatDateRange(trip.startDate, trip.endDate, locale, getPageTranslator(locale)('trip.dateRange.invalid'));
}

export function setAppShellTitle(title: string) {
  const target = document.querySelector<HTMLElement>('[data-app-title]');

  if (target) {
    target.textContent = title;
  }
}

export function setTripContextName(name?: string) {
  const header = document.querySelector<HTMLElement>('[data-trip-context-header]');
  const target = document.querySelector<HTMLElement>('[data-trip-context-name]');
  const normalizedName = name?.trim() ?? '';

  if (target) {
    target.textContent = normalizedName;
  }

  if (header) {
    header.hidden = normalizedName.length === 0;
  }
}

export function setAppShellDescription(description?: string) {
  const target = document.querySelector<HTMLElement>('[data-app-description]');

  if (!target) {
    return;
  }

  if (!description) {
    target.hidden = true;
    return;
  }

  target.hidden = false;
  target.textContent = description;
}

export function setAppShellMeta(items: string[]) {
  const target = document.querySelector<HTMLElement>('[data-app-meta]');
  const filtered = items.filter(Boolean);

  if (!target) {
    return;
  }

  if (filtered.length === 0) {
    target.hidden = true;
    target.innerHTML = '';
    return;
  }

  target.hidden = false;
  target.innerHTML = filtered
    .map((item) => `<span class="app-shell-meta-item">${escapeHtml(item)}</span>`)
    .join('');
}

export function setBreadcrumbItem(key: string, label: string, href?: string) {
  const target = document.querySelector<HTMLElement>(`[data-breadcrumb-key="${key}"]`);

  if (target) {
    target.textContent = label;
    if (target instanceof HTMLAnchorElement && href) {
      target.href = href;
      target.removeAttribute('aria-disabled');
      target.removeAttribute('tabindex');
    }
  }
}

function setNavigationLinkHref(id: string, href: string) {
  const link = document.querySelector<HTMLAnchorElement>(`#${id}`);

  if (link) {
    link.href = href;
  }
}

export function setNavigationLinkHidden(id: string, hidden: boolean) {
  const link = document.querySelector<HTMLAnchorElement>(`#${id}`);

  if (link) {
    link.hidden = hidden;
  }
}

export function syncTripNavigation(locale: Locale, tripId: string) {
  const tripUrl = getAppUrl(locale, 'trip', { trip: tripId });
  const accommodationMapsLink = document.querySelector<HTMLAnchorElement>('#trip-accommodation-maps-link');

  document.querySelectorAll<HTMLButtonElement>('[data-trip-back-button]').forEach((button) => {
    button.dataset.fallbackHref = tripUrl;
  });

  setNavigationLinkHref('trip-plans-link', tripUrl);
  setNavigationLinkHref('trip-create-plan-link', getAppUrl(locale, 'plan-create', { trip: tripId }));
  setNavigationLinkHref('trip-checklist-link', getAppUrl(locale, 'trip-checklist', { trip: tripId }));
  setNavigationLinkHref('trip-luggage-link', getAppUrl(locale, 'trip-luggage', { trip: tripId }));
  setNavigationLinkHref('trip-weather-link', getAppUrl(locale, 'trip-weather', { trip: tripId }));
  setNavigationLinkHref('trip-weather-action-link', getAppUrl(locale, 'trip-weather', { trip: tripId }));
  setNavigationLinkHref('trip-ai-link', getAppUrl(locale, 'trip-plan-suggestions', { trip: tripId }));
  setNavigationLinkHref('trip-ai-prompt-link', getAppUrl(locale, 'trip-ai-prompt', { trip: tripId }));
  setNavigationLinkHref('trip-accommodation-link', getAppUrl(locale, 'trip-accommodation', { trip: tripId }));
  setNavigationLinkHref('trip-pois-link', getAppUrl(locale, 'trip-pois', { trip: tripId }));
  setNavigationLinkHref('trip-pois-action-link', getAppUrl(locale, 'trip-pois', { trip: tripId }));
  setNavigationLinkHref('trip-members-link', getAppUrl(locale, 'trip-members', { trip: tripId }));
  setNavigationLinkHref('trip-calendar-link', getAppUrl(locale, 'calendar', { trip: tripId }));
  setNavigationLinkHref('trip-map-link', getAppUrl(locale, 'map', { trip: tripId }));
  setNavigationLinkHref('trip-edit-link', getAppUrl(locale, 'trip-edit', { trip: tripId }));

  if (accommodationMapsLink) {
    accommodationMapsLink.href = getAppUrl(locale, 'trip-accommodation', { trip: tripId });
    accommodationMapsLink.hidden = true;
  }
}

export function syncTripShell(locale: Locale, trip: TripRecord) {
  setTripContextName(trip.name);
  setAppShellDescription(`${trip.location} · ${formatTripDateRange(locale, trip)}`);
  setAppShellMeta([]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  revealAppShell();
}

export function syncAccommodationShell(locale: Locale, trip: TripRecord) {
  const t = getPageTranslator(locale);
  const accommodationName = trip.accommodation?.name || t('accommodation.emptyTitle');

  setTripContextName(trip.name);
  setAppShellTitle(accommodationName);
  setAppShellDescription(
    trip.accommodation ? getAccommodationLocationLabel(trip.accommodation) : t('accommodation.emptyDescription'),
  );
  setAppShellMeta([
    trip.location,
    trip.accommodation ? t('accommodation.status.configured') : t('accommodation.status.empty'),
  ]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem(
    'trip-accommodation',
    t('accommodation.breadcrumb'),
    getAppUrl(locale, 'trip-accommodation', { trip: trip.id }),
  );
  revealAppShell();
}

export function syncPlanShell(locale: Locale, trip: TripRecord, plan: PlanRecord) {
  setTripContextName(trip.name);
  setAppShellTitle(plan.name);
  setAppShellDescription(plan.description || getCategoryLabel(locale, plan.category));
  setAppShellMeta([
    formatPlanMoment(plan, locale) || getPageTranslator(locale)('calendar.unscheduled'),
    getPlanStatusLabel(locale, plan.status),
    hasPlanLocation(plan) ? getPlanLocationLabel(plan) : '',
  ]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem('plan', plan.name, getAppUrl(locale, 'plan', { trip: trip.id, plan: plan.id }));
  revealAppShell();
}

export function syncChecklistShell(locale: Locale, trip: TripRecord, pendingCount: number, completedCount: number) {
  const t = getPageTranslator(locale);

  setTripContextName(trip.name);
  setAppShellTitle(t('tripChecklist.title'));
  setAppShellDescription('');
  setAppShellMeta([]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem(
    'trip-checklist',
    t('tripChecklist.breadcrumb'),
    getAppUrl(locale, 'trip-checklist', { trip: trip.id }),
  );
}

export function syncWeatherShell(locale: Locale, trip: TripRecord) {
  const t = getPageTranslator(locale);

  setTripContextName(trip.name);
  setAppShellTitle(t('weather.title'));
  setAppShellDescription(t('weather.pageDescription'));
  setAppShellMeta([trip.location, formatTripDateRange(locale, trip)]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem('trip-weather', t('weather.breadcrumb'), getAppUrl(locale, 'trip-weather', { trip: trip.id }));
  revealAppShell();
}

export function syncLuggageShell(locale: Locale, trip: TripRecord) {
  const t = getPageTranslator(locale);

  setTripContextName(trip.name);
  setAppShellTitle(t('tripLuggage.title'));
  setAppShellDescription(t('tripLuggage.privateHelper'));
  setAppShellMeta([t('tripLuggage.privateBadge')]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem(
    'trip-luggage',
    t('tripLuggage.breadcrumb'),
    getAppUrl(locale, 'trip-luggage', { trip: trip.id }),
  );
}
