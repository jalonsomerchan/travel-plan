import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import type { PlanRecord, TripMemberRecord, TripRecord } from '../../lib/app/models';
import {
  getPlanDayOrderUpdates,
  getPlanDayPlans,
  type PlanOrderDirection,
} from '../../lib/app/plan-order';
import { subscribeTripPlans, updatePlanDayOrders } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip, subscribeTripMembers } from '../../lib/firebase/trips';

function getCopy(locale: Locale) {
  if (locale === 'en') {
    return {
      label: 'Day order',
      up: 'Move up',
      down: 'Move down',
      updated: 'Order updated.',
      error: 'The day order could not be updated.',
    };
  }

  return {
    label: 'Orden del dia',
    up: 'Subir',
    down: 'Bajar',
    updated: 'Orden actualizado.',
    error: 'No se pudo actualizar el orden del dia.',
  };
}

function getCardPlanId(card: HTMLElement) {
  const planIdElement = card.querySelector<HTMLElement>('[data-plan-id]');
  const deleteElement = card.querySelector<HTMLElement>('[data-plan-delete-action]');

  return planIdElement?.dataset.planId ?? deleteElement?.dataset.planDeleteAction ?? '';
}

function getButtonLabel(locale: Locale, direction: PlanOrderDirection, plan: PlanRecord) {
  const copy = getCopy(locale);
  const action = direction === 'up' ? copy.up : copy.down;

  return `${action}: ${plan.name}`;
}

function renderOrderButton(
  locale: Locale,
  plan: PlanRecord,
  direction: PlanOrderDirection,
  disabled: boolean,
) {
  const copy = getCopy(locale);
  const label = getButtonLabel(locale, direction, plan);
  const icon = direction === 'up' ? '↑' : '↓';
  const text = direction === 'up' ? copy.up : copy.down;

  return `
    <button
      aria-label="${escapeHtml(label)}"
      class="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-xs)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      data-plan-id="${escapeHtml(plan.id)}"
      data-plan-order-action="${direction}"
      ${disabled ? 'disabled' : ''}
      title="${escapeHtml(label)}"
      type="button"
    >
      <span aria-hidden="true">${icon}</span>
      <span class="sr-only">${escapeHtml(text)}</span>
    </button>
  `;
}

function renderOrderControls(locale: Locale, plan: PlanRecord, dayIndex: number, total: number) {
  const copy = getCopy(locale);

  return `
    <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3" data-list-detail data-plan-order-controls>
      <span class="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-text-soft)]">${escapeHtml(copy.label)}</span>
      ${renderOrderButton(locale, plan, 'up', dayIndex === 0)}
      ${renderOrderButton(locale, plan, 'down', dayIndex === total - 1)}
    </div>
  `;
}

function userCanEditTrip(userId: string, trip: TripRecord | null, members: TripMemberRecord[]) {
  return Boolean(
    userId &&
      trip &&
      (trip.ownerId === userId ||
        members.some((member) => member.role === 'editor' && (member.userId === userId || member.id === userId))),
  );
}

function ensureFeedbackRegion(planList: HTMLElement) {
  if (planList.querySelector('[data-plan-order-feedback]')) {
    return;
  }

  planList.insertAdjacentHTML(
    'afterbegin',
    '<p class="sr-only" data-plan-order-feedback aria-live="polite"></p>',
  );
}

export function mountTripPlanOrder({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const subscriptions = createSubscriptionScope();
  const copy = getCopy(locale);
  let currentUserId = '';
  let currentTrip: TripRecord | null = null;
  let currentMembers: TripMemberRecord[] = [];
  let plans: PlanRecord[] = [];
  let syncQueued = false;
  let observedPlanList: HTMLElement | null = null;

  if (!tripId) {
    return;
  }

  const syncControls = () => {
    syncQueued = false;
    const planList = document.querySelector<HTMLElement>('[data-plan-list]');

    if (!planList) {
      return;
    }

    ensureFeedbackRegion(planList);
    const canEdit = userCanEditTrip(currentUserId, currentTrip, currentMembers);

    planList.querySelectorAll<HTMLElement>('[data-list-card]').forEach((card) => {
      const existingControls = card.querySelector<HTMLElement>('[data-plan-order-controls]');
      const planId = getCardPlanId(card);
      const plan = plans.find((item) => item.id === planId);

      if (!canEdit || !plan) {
        existingControls?.remove();
        return;
      }

      const dayPlans = getPlanDayPlans(plans, plan.id);
      const dayIndex = dayPlans.findIndex((item) => item.id === plan.id);

      if (dayIndex < 0 || dayPlans.length < 2) {
        existingControls?.remove();
        return;
      }

      const controlsHtml = renderOrderControls(locale, plan, dayIndex, dayPlans.length);

      if (existingControls) {
        existingControls.outerHTML = controlsHtml;
      } else {
        card.insertAdjacentHTML('beforeend', controlsHtml);
      }
    });
  };

  const queueSyncControls = () => {
    if (syncQueued) {
      return;
    }

    syncQueued = true;
    queueMicrotask(syncControls);
  };

  const observer = new MutationObserver(queueSyncControls);

  const ensureObserver = () => {
    const planList = document.querySelector<HTMLElement>('[data-plan-list]');

    if (!planList || planList === observedPlanList) {
      return;
    }

    observer.disconnect();
    observedPlanList = planList;
    observer.observe(planList, { childList: true });
  };

  const sync = () => {
    ensureObserver();
    queueSyncControls();
  };

  document.querySelector<HTMLElement>('[data-plan-list]')?.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-plan-order-action]');

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const planId = button.dataset.planId ?? '';
    const direction = button.dataset.planOrderAction as PlanOrderDirection | undefined;

    if (
      !planId ||
      (direction !== 'up' && direction !== 'down') ||
      !userCanEditTrip(currentUserId, currentTrip, currentMembers)
    ) {
      return;
    }

    const updates = getPlanDayOrderUpdates(plans, planId, direction);

    if (updates.length === 0) {
      return;
    }

    try {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      await updatePlanDayOrders(tripId, updates);
      document.querySelector<HTMLElement>('[data-plan-order-feedback]')?.replaceChildren(copy.updated);
    } catch (error) {
      console.error('updatePlanDayOrders', error);
      document.querySelector<HTMLElement>('[data-plan-order-feedback]')?.replaceChildren(copy.error);
    } finally {
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  });

  window.addEventListener(
    'pagehide',
    () => {
      subscriptions.clear();
      observer.disconnect();
    },
    { once: true },
  );

  observeSession((user) => {
    subscriptions.clear();
    currentUserId = user?.uid ?? '';
    currentTrip = null;
    currentMembers = [];
    plans = [];
    sync();

    if (!user) {
      return;
    }

    subscriptions.add(subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      sync();
    }));

    subscriptions.add(subscribeTripMembers(tripId, (members) => {
      currentMembers = members;
      sync();
    }));

    subscriptions.add(subscribeTripPlans(tripId, (nextPlans) => {
      plans = nextPlans;
      sync();
    }));
  });
}
