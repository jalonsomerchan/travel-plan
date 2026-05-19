import { type Locale } from '../../config/site';
import { useTranslations } from '../../i18n/ui';
import { withBasePath } from '../../utils/paths';
import {
  planCategoryValues,
  planStatusValues,
  tripMemberRoles,
  tripStatusValues,
  type PlanCategory,
  type PlanStatus,
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

export function redirectTo(locale: Locale, view: Parameters<typeof getAppUrl>[1], params = {}) {
  window.location.href = getAppUrl(locale, view, params);
}

export function redirectHome(locale: Locale) {
  window.location.href = locale === 'es' ? withBasePath('/') : withBasePath(`/${locale}/`);
}

export function bindSignOut(button: HTMLButtonElement | null, locale: Locale) {
  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
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
