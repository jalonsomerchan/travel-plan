import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { validatePlanLinks, withPlanLinksFromForm } from '../../lib/app/plan-links';
import { getPlanInputFromForm, getPlanLocationValidationKey } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { getPlanOnce } from '../../lib/firebase/plan-reads';
import { queueUpdatePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { initPlanLinksFields, setPlanLinkRows } from './plan-links-fields';
import { initLocationPickers } from './plan-location-picker';
import { ensureFirebaseReady, getPageTranslator, syncPlanShell, syncTripNavigation, syncTripShell } from './shared';

export function mountPlanEditPage({ locale }: { locale: Locale }) {
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const form = document.querySelector<HTMLFormElement>('#plan-form');
  const message = document.querySelector<HTMLElement>('#plan-form-message');
  const context = document.querySelector<HTMLElement>('[data-plan-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#plan-edit-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentPlan: PlanRecord | null = null;

  if (!tripId || !planId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (backLink) backLink.href = getAppUrl(locale, 'plan', { trip: tripId, plan: planId });
  initLocationPickers();
  initPlanLinksFields(form);

  const syncShell = () => {
    if (currentTrip && currentPlan) {
      syncPlanShell(locale, currentTrip, currentPlan);
      initLocationPickers();
    } else if (currentTrip) {
      syncTripShell(locale, currentTrip);
      initLocationPickers();
    }
  };

  const syncPlanForm = (plan: PlanRecord) => {
    (form.elements.namedItem('name') as HTMLInputElement).value = plan.name;
    (form.elements.namedItem('description') as HTMLTextAreaElement).value = plan.description;
    (form.elements.namedItem('category') as HTMLSelectElement).value = plan.category;
    (form.elements.namedItem('status') as HTMLSelectElement).value = plan.status;
    (form.elements.namedItem('isPaid') as HTMLInputElement).checked = plan.isPaid;
    (form.elements.namedItem('isBooked') as HTMLInputElement).checked = plan.isBooked;
    (form.elements.namedItem('isOptional') as HTMLInputElement).checked = plan.isOptional;
    (form.elements.namedItem('isImportant') as HTMLInputElement).checked = plan.isImportant;
    (form.elements.namedItem('locationName') as HTMLInputElement).value = plan.locationName ?? '';
    (form.elements.namedItem('locationLat') as HTMLInputElement).value = plan.locationLat !== undefined ? String(plan.locationLat) : '';
    (form.elements.namedItem('locationLng') as HTMLInputElement).value = plan.locationLng !== undefined ? String(plan.locationLng) : '';
    (form.elements.namedItem('date') as HTMLInputElement).value = plan.date ?? '';
    (form.elements.namedItem('time') as HTMLInputElement).value = plan.time ?? '';
    setPlanLinkRows(form, plan.links);
    initLocationPickers();
  };

  observeSession((user) => {
    currentTrip = null;
    currentPlan = null;

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    void Promise.all([getTripOnce(tripId), getPlanOnce(tripId, planId)]).then(([trip, plan]) => {
      if (trip) {
        currentTrip = trip;
        syncShell();
        if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }

      if (plan) {
        currentPlan = plan;
        syncShell();
        syncPlanForm(plan);
      }
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const locationValidationKey = getPlanLocationValidationKey(form);

    if (locationValidationKey) {
      setMessage(message, t(locationValidationKey), 'danger');
      return;
    }

    const planInput = withPlanLinksFromForm(form, getPlanInputFromForm(form));

    if (currentPlan?.aiGuide) {
      planInput.aiGuide = currentPlan.aiGuide;
    }

    const linksValidation = validatePlanLinks(planInput.links ?? []);

    if (!linksValidation.valid) {
      setMessage(message, t(linksValidation.errorKey ?? 'plan.links.invalidUrl'), 'danger');
      return;
    }

    setButtonBusy(button, true, t('plan.form.save'), t('common.saving'));
    queueUpdatePlan(tripId, planId, planInput);
    setMessage(message, t('plan.form.saved'), 'success');
    window.location.href = getAppUrl(locale, 'plan', { trip: tripId, plan: planId });
  });
}