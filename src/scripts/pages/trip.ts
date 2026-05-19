import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import { getPlanInputFromForm, getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import type { PlanRecord, TripMemberRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import { createPlan, subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { inviteUserToTrip, subscribeTrip, subscribeTripMembers, updateTrip } from '../../lib/firebase/trips';
import { initPlanLocationPickers } from './plan-location-picker';
import {
  disableForm,
  ensureFirebaseReady,
  getCategoryLabel,
  getPageTranslator,
  getPlanStatusLabel,
  getPlanStatusTone,
  getRoleLabel,
  getTripStatusLabel,
  getTripStatusTone,
} from './shared';

function canEditTrip(user: User | null, trip: TripRecord | null, members: TripMemberRecord[]) {
  if (!user || !trip) {
    return false;
  }

  if (trip.ownerId === user.uid) {
    return true;
  }

  return members.some((member) => member.userId === user.uid && member.role === 'editor');
}

function renderMembers(locale: Locale, members: TripMemberRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-member-list]');

  if (!target) {
    return;
  }

  if (members.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.membersEmpty'))}</article>`;
    return;
  }

  target.innerHTML = members
    .map(
      (member) => `
        <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-[var(--color-text)]">${escapeHtml(member.email)}</p>
              <p class="mt-1 text-sm text-[var(--color-text-soft)]">${escapeHtml(getRoleLabel(locale, member.role))}</p>
            </div>
            <span class="status-pill" data-tone="primary">${escapeHtml(getRoleLabel(locale, member.role))}</span>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderPlans(locale: Locale, tripId: string, plans: PlanRecord[]) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-plan-list]');

  if (!target) {
    return;
  }

  if (plans.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('trip.plansEmpty'))}</article>`;
    return;
  }

  target.innerHTML = plans
    .map((plan) => {
      const planUrl = getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id });

      return `
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-xs)]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
              <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(getCategoryLabel(locale, plan.category))}</p>
            </div>
            <span class="status-pill" data-tone="${getPlanStatusTone(plan.status)}">${escapeHtml(getPlanStatusLabel(locale, plan.status))}</span>
          </div>
          <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(plan.description || t('plan.descriptionEmpty'))}</p>
          <p class="mt-4 text-sm text-[var(--color-text-soft)]">${escapeHtml(formatPlanMoment(plan, locale) || t('calendar.unscheduled'))}</p>
          ${
            hasPlanLocation(plan)
              ? `<p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('plan.location.selected'))}: ${escapeHtml(getPlanLocationLabel(plan))}</p>`
              : ''
          }
          <div class="mt-5">
            <a class="inline-flex rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]" href="${planUrl}">${escapeHtml(t('trip.openPlan'))}</a>
          </div>
        </article>
      `;
    })
    .join('');
}

export function mountTripPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const tripForm = document.querySelector<HTMLFormElement>('#trip-form');
  const inviteForm = document.querySelector<HTMLFormElement>('#invite-form');
  const planCreateForm = document.querySelector<HTMLFormElement>('#plan-create-form');
  const tripMessage = document.querySelector<HTMLElement>('#trip-form-message');
  const inviteMessage = document.querySelector<HTMLElement>('#invite-message');
  const planMessage = document.querySelector<HTMLElement>('#plan-create-message');
  const tripContext = document.querySelector<HTMLElement>('[data-trip-context]');
  const calendarLink = document.querySelector<HTMLAnchorElement>('#trip-calendar-link');
  const mapLink = document.querySelector<HTMLAnchorElement>('#trip-map-link');
  const tripButton = tripForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const inviteButton = inviteForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const planButton = planCreateForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  let currentUser: User | null = null;
  let currentTrip: TripRecord | null = null;
  let currentMembers: TripMemberRecord[] = [];

  if (!tripId) {
    if (tripContext) {
      tripContext.textContent = t('trip.missingId');
    }
    disableForm(tripForm, true);
    disableForm(inviteForm, true);
    disableForm(planCreateForm, true);
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (calendarLink) {
    calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  }

  if (mapLink) {
    mapLink.href = getAppUrl(locale, 'map', { trip: tripId });
  }

  initPlanLocationPickers();

  const syncPermissions = () => {
    const editable = canEditTrip(currentUser, currentTrip, currentMembers);

    disableForm(tripForm, !editable);
    disableForm(inviteForm, !editable);
    disableForm(planCreateForm, !editable);
  };

  observeSession((user) => {
    currentUser = user;

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      syncPermissions();

      if (!trip) {
        if (tripContext) {
          tripContext.textContent = t('trip.notFound');
        }
        return;
      }

      if (tripContext) {
        tripContext.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }

      if (tripForm) {
        (tripForm.elements.namedItem('name') as HTMLInputElement).value = trip.name;
        (tripForm.elements.namedItem('location') as HTMLInputElement).value = trip.location;
        (tripForm.elements.namedItem('startDate') as HTMLInputElement).value = trip.startDate;
        (tripForm.elements.namedItem('endDate') as HTMLInputElement).value = trip.endDate;
        (tripForm.elements.namedItem('status') as HTMLSelectElement).value = trip.status;
      }
    });

    subscribeTripMembers(tripId, (members) => {
      currentMembers = members;
      renderMembers(locale, members);
      syncPermissions();
    });

    subscribeTripPlans(tripId, (plans) => renderPlans(locale, tripId, plans));
  });

  tripForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentTrip) {
      return;
    }

    const data = new FormData(tripForm);
    setButtonBusy(tripButton, true, t('trip.form.save'), t('common.saving'));

    try {
      await updateTrip(tripId, {
        name: String(data.get('name') ?? ''),
        location: String(data.get('location') ?? ''),
        startDate: String(data.get('startDate') ?? ''),
        endDate: String(data.get('endDate') ?? ''),
        status: String(data.get('status') ?? 'idea') as TripRecord['status'],
      });
      setMessage(tripMessage, t('trip.form.saved'), 'success');
    } catch (error) {
      setMessage(tripMessage, error instanceof Error ? error.message : t('trip.form.error'), 'danger');
    } finally {
      setButtonBusy(tripButton, false, t('trip.form.save'), t('common.saving'));
    }
  });

  inviteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentTrip || !currentUser) {
      return;
    }

    const data = new FormData(inviteForm);
    setButtonBusy(inviteButton, true, t('trip.invite.action'), t('trip.invite.sending'));

    try {
      await inviteUserToTrip(
        currentUser,
        tripId,
        currentTrip.name,
        currentTrip.location,
        currentTrip.startDate,
        currentTrip.endDate,
        String(data.get('email') ?? ''),
        String(data.get('role') ?? 'viewer') as TripMemberRecord['role'],
      );
      inviteForm.reset();
      setMessage(inviteMessage, t('trip.invite.sent'), 'success');
    } catch (error) {
      setMessage(inviteMessage, error instanceof Error ? error.message : t('trip.invite.error'), 'danger');
    } finally {
      setButtonBusy(inviteButton, false, t('trip.invite.action'), t('trip.invite.sending'));
    }
  });

  planCreateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    setButtonBusy(planButton, true, t('trip.plansAction'), t('trip.plansCreating'));

    try {
      const planId = await createPlan(tripId, getPlanInputFromForm(planCreateForm));
      planCreateForm.reset();
      initPlanLocationPickers();
      setMessage(planMessage, t('trip.plansCreated'), 'success');
      window.location.href = getAppUrl(locale, 'plan', { trip: tripId, plan: planId });
    } catch (error) {
      setMessage(planMessage, error instanceof Error ? error.message : t('trip.plansError'), 'danger');
    } finally {
      setButtonBusy(planButton, false, t('trip.plansAction'), t('trip.plansCreating'));
    }
  });
}
