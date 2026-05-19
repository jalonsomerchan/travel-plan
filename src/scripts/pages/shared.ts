import { type Locale } from '../../config/site';
import { useTranslations } from '../../i18n/ui';
import { getAccommodationLocationLabel } from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { withBasePath } from '../../utils/paths';
import {
  planCategoryValues,
  planStatusValues,
  tripMemberRoles,
  tripStatusValues,
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

  if (status === 'discarded') {
    return 'danger';
  }

  return 'primary';
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

export function getCategoryOptions(locale: Locale) {
  return planCategoryValues.map((category) => ({ value: category, label: getCategoryLabel(locale, category) }));
}

export function getRoleOptions(locale: Locale) {
  return tripMemberRoles.map((role) => ({ value: role, label: getRoleLabel(locale, role) }));
}

export function setAppShellTitle(title: string) {
  const target = document.querySelector<HTMLElement>('[data-app-title]');

  if (target) {
    target.textContent = title;
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

export function syncTripShell(locale: Locale, trip: TripRecord) {
  setAppShellTitle(trip.name);
  setAppShellDescription(trip.location);
  setAppShellMeta([
    formatDateRange(trip.startDate, trip.endDate, locale),
    getTripStatusLabel(locale, trip.status),
    trip.ownerEmail,
  ]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  revealAppShell();
}

export function syncAccommodationShell(locale: Locale, trip: TripRecord) {
  const t = getPageTranslator(locale);
  const accommodationName = trip.accommodation?.name || t('accommodation.emptyTitle');

  setAppShellTitle(accommodationName);
  setAppShellDescription(
    trip.accommodation ? getAccommodationLocationLabel(trip.accommodation) : t('accommodation.emptyDescription'),
  );
  setAppShellMeta([
    trip.name,
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
  setAppShellTitle(plan.name);
  setAppShellDescription(plan.description || getCategoryLabel(locale, plan.category));
  setAppShellMeta([
    trip.name,
    formatPlanMoment(plan, locale) || getPageTranslator(locale)('calendar.unscheduled'),
    getPlanStatusLabel(locale, plan.status),
    hasPlanLocation(plan) ? getPlanLocationLabel(plan) : '',
  ]);
  setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
  setBreadcrumbItem('plan', plan.name, getAppUrl(locale, 'plan', { trip: trip.id, plan: plan.id }));
  revealAppShell();
}