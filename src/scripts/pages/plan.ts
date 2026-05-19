import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import type { TripMemberRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { subscribePlan, updatePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip, subscribeTripMembers } from '../../lib/firebase/trips';
import { disableForm, ensureFirebaseReady, getPageTranslator } from './shared';

function canEditTrip(user: User | null, trip: TripRecord | null, members: TripMemberRecord[]) {
  if (!user || !trip) {
    return false;
  }

  if (trip.ownerId === user.uid) {
    return true;
  }

  return members.some((member) => member.userId === user.uid && member.role === 'editor');
}

export function mountPlanPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const form = document.querySelector<HTMLFormElement>('#plan-form');
  const message = document.querySelector<HTMLElement>('#plan-form-message');
  const context = document.querySelector<HTMLElement>('[data-plan-context]');
  const backLink = document.querySelector<HTMLAnchorElement>('#plan-back-trip-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  let currentUser: User | null = null;
  let currentTrip: TripRecord | null = null;
  let currentMembers: TripMemberRecord[] = [];

  if (!tripId || !planId) {
    if (context) {
      context.textContent = t('plan.missingId');
    }
    disableForm(form, true);
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  const syncPermissions = () => disableForm(form, !canEditTrip(currentUser, currentTrip, currentMembers));

  observeSession((user) => {
    currentUser = user;

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      syncPermissions();

      if (trip && context) {
        context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }
    });

    subscribeTripMembers(tripId, (members) => {
      currentMembers = members;
      syncPermissions();
    });

    subscribePlan(tripId, planId, (plan) => {
      if (!plan || !form) {
        return;
      }

      (form.elements.namedItem('name') as HTMLInputElement).value = plan.name;
      (form.elements.namedItem('description') as HTMLTextAreaElement).value = plan.description;
      (form.elements.namedItem('category') as HTMLSelectElement).value = plan.category;
      (form.elements.namedItem('status') as HTMLSelectElement).value = plan.status;
      (form.elements.namedItem('date') as HTMLInputElement).value = plan.date ?? '';
      (form.elements.namedItem('time') as HTMLInputElement).value = plan.time ?? '';
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    setButtonBusy(button, true, t('plan.form.save'), t('common.saving'));

    try {
      await updatePlan(tripId, planId, {
        name: String(data.get('name') ?? ''),
        description: String(data.get('description') ?? ''),
        category: String(data.get('category') ?? 'visit') as import('../../lib/app/models').PlanRecord['category'],
        date: String(data.get('date') ?? '') || undefined,
        time: String(data.get('time') ?? '') || undefined,
        status: String(data.get('status') ?? 'pending') as import('../../lib/app/models').PlanRecord['status'],
      });
      setMessage(message, t('plan.form.saved'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('plan.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('plan.form.save'), t('common.saving'));
    }
  });
}
