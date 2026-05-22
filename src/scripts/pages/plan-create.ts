import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import { getForcedPlanDateForTrip, normalizePlanInputForTrip, validatePlanDateForTrip } from '../../lib/app/plan-dates';
import type { TripRecord } from '../../lib/app/models';
import { validatePlanLinks, withPlanLinksFromForm } from '../../lib/app/plan-links';
import { getPlanInputFromForm, getPlanLocationValidationKey } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { queueCreatePlan } from '../../lib/firebase/plans';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { observeSession } from '../../lib/firebase/session';
import { initPlanLinksFields } from './plan-links-fields';
import { initLocationPickers } from './plan-location-picker';
import { ensureFirebaseReady, getPageTranslator, syncTripNavigation, syncTripShell } from './shared';

export function mountPlanCreatePage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#plan-create-form');
  const message = document.querySelector<HTMLElement>('#plan-create-message');
  const context = document.querySelector<HTMLElement>('[data-plan-create-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#plan-create-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentParentTrip: TripRecord | null = null;
  if (!tripId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (backLink) backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  initLocationPickers();
  initPlanLinksFields(form);

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    void getTripOnce(tripId).then((trip) => {
      if (!trip) return;
      currentTrip = trip;
      syncTripShell(locale, trip);
      initLocationPickers();
      if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      const dateInput = form.elements.namedItem('date') as HTMLInputElement | null;
      const forcedDate = getForcedPlanDateForTrip(trip);

      if (dateInput && forcedDate) {
        dateInput.value = forcedDate;
      }

      if (trip.parentTripId) {
        void getTripOnce(trip.parentTripId).then((parentTrip) => {
          currentParentTrip = parentTrip;
        });
      } else {
        currentParentTrip = null;
      }
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentTrip) {
      return;
    }
    const locationValidationKey = getPlanLocationValidationKey(form);

    if (locationValidationKey) {
      setMessage(message, t(locationValidationKey), 'danger');
      return;
    }

    const planInput = normalizePlanInputForTrip(
      withPlanLinksFromForm(form, getPlanInputFromForm(form)),
      currentTrip,
    );
    const dateValidation = validatePlanDateForTrip(planInput.date, currentTrip, currentParentTrip);

    if (!dateValidation.valid) {
      setMessage(message, t(dateValidation.errorKey ?? 'plan.form.dateOutsideParentTripRange'), 'danger');
      return;
    }

    const linksValidation = validatePlanLinks(planInput.links ?? []);

    if (!linksValidation.valid) {
      setMessage(message, t(linksValidation.errorKey ?? 'plan.links.invalidUrl'), 'danger');
      return;
    }

    setButtonBusy(button, true, t('trip.plansAction'), t('trip.plansCreating'));
    queueCreatePlan(tripId, planInput);
    setMessage(message, t('trip.plansCreated'), 'success');
    window.location.href = getAppUrl(locale, 'trip', { trip: tripId });
  });
}
