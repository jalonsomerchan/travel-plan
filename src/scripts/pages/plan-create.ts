import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import { validatePlanLinks, withPlanLinksFromForm } from '../../lib/app/plan-links';
import { getPlanInputFromForm, getPlanLocationValidationKey } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { createPlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
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
    subscribeTrip(tripId, (trip) => {
      if (trip) {
        syncTripShell(locale, trip);
        initLocationPickers();
        if (context) context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const locationValidationKey = getPlanLocationValidationKey(form);

    if (locationValidationKey) {
      setMessage(message, t(locationValidationKey), 'danger');
      return;
    }

    const planInput = withPlanLinksFromForm(form, getPlanInputFromForm(form));
    const linksValidation = validatePlanLinks(planInput.links ?? []);

    if (!linksValidation.valid) {
      setMessage(message, t(linksValidation.errorKey ?? 'plan.links.invalidUrl'), 'danger');
      return;
    }

    setButtonBusy(button, true, t('trip.plansAction'), t('trip.plansCreating'));
    try {
      await createPlan(tripId, planInput);
      setMessage(message, t('trip.plansCreated'), 'success');
      window.location.href = getAppUrl(locale, 'trip', { trip: tripId });
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('trip.plansError'), 'danger');
    } finally {
      setButtonBusy(button, false, t('trip.plansAction'), t('trip.plansCreating'));
    }
  });
}
