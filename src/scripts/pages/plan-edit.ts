import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getPlanInputFromForm } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribePlan, updatePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { initPlanLocationPickers } from './plan-location-picker';
import { ensureFirebaseReady, getPageTranslator, syncPlanShell, syncTripShell } from './shared';

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
  if (!tripId || !planId || !form) return;
  if (!ensureFirebaseReady(locale)) return;
  if (backLink) backLink.href = getAppUrl(locale, 'plan', { trip: tripId, plan: planId });
  initPlanLocationPickers();
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    let currentTrip: TripRecord | null = null;
    let currentPlan: PlanRecord | null = null;

    const syncShell = () => {
      if (currentTrip && currentPlan) {
        syncPlanShell(locale, currentTrip, currentPlan);
      } else if (currentTrip) {
        syncTripShell(locale, currentTrip);
      }
    };

    subscribeTrip(tripId, (trip) => {
      if (trip) {
        currentTrip = trip;
        syncShell();
        if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }
    });
    subscribePlan(tripId, planId, (plan) => {
      if (!plan) return;
      currentPlan = plan;
      syncShell();
      (form.elements.namedItem('name') as HTMLInputElement).value = plan.name;
      (form.elements.namedItem('description') as HTMLTextAreaElement).value = plan.description;
      (form.elements.namedItem('category') as HTMLSelectElement).value = plan.category;
      (form.elements.namedItem('status') as HTMLSelectElement).value = plan.status;
      (form.elements.namedItem('locationName') as HTMLInputElement).value = plan.locationName ?? '';
      (form.elements.namedItem('locationLat') as HTMLInputElement).value = plan.locationLat !== undefined ? String(plan.locationLat) : '';
      (form.elements.namedItem('locationLng') as HTMLInputElement).value = plan.locationLng !== undefined ? String(plan.locationLng) : '';
      (form.elements.namedItem('date') as HTMLInputElement).value = plan.date ?? '';
      (form.elements.namedItem('time') as HTMLInputElement).value = plan.time ?? '';
      initPlanLocationPickers();
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setButtonBusy(button, true, t('plan.form.save'), t('common.saving'));
    try {
      await updatePlan(tripId, planId, getPlanInputFromForm(form));
      setMessage(message, t('plan.form.saved'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('plan.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('plan.form.save'), t('common.saving'));
    }
  });
}
