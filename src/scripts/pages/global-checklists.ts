import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { setMessage } from '../../lib/app/dom';
import type { ChecklistItemRecord, TripRecord } from '../../lib/app/models';
import { updateTripChecklistItem, deleteTripChecklistItem } from '../../lib/firebase/checklists';
import { getFirebasePublicConfig } from '../../lib/firebase/config';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeUserTrips } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getPageTranslator,
  redirectHome,
  revealAppShell,
} from './shared';
import {
  getAllChecklistGroups,
  type ChecklistItemsByTrip,
  subscribeTripsChecklistItems,
} from './checklist-summary';
import {
  getCompletedChecklistCount,
  getPendingChecklistCount,
  renderChecklistGroups,
} from './trip-checklist-groups';

function logTripsPermissionError(user: User | null) {
  const config = getFirebasePublicConfig();

  console.error('subscribeUserTrips.globalChecklists.debug', {
    projectId: config.projectId,
    authDomain: config.authDomain,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
  });
}

function renderGlobalChecklists(
  locale: Locale,
  trips: TripRecord[],
  itemsByTrip: ChecklistItemsByTrip,
) {
  const t = getPageTranslator(locale);
  const groups = getAllChecklistGroups(locale, trips, itemsByTrip);
  const tripCountTarget = document.querySelector<HTMLElement>('[data-global-checklists-trip-count]');
  const messageTarget = document.querySelector<HTMLElement>('[data-global-checklists-message]');
  const pendingCount = getPendingChecklistCount(groups);
  const completedCount = getCompletedChecklistCount(groups);

  if (tripCountTarget) {
    tripCountTarget.textContent = t('globalChecklists.tripSummary').replace('{count}', String(trips.length));
  }

  if (messageTarget) {
    messageTarget.textContent = t('globalChecklists.summary')
      .replace('{pending}', String(pendingCount))
      .replace('{completed}', String(completedCount));
  }

  renderChecklistGroups(locale, groups, { emptyLabel: t('globalChecklists.empty') });
}

function getChecklistItem(
  tripId: string,
  checklistItemId: string,
  itemsByTrip: ChecklistItemsByTrip,
) {
  return itemsByTrip.get(tripId)?.find((item) => item.id === checklistItemId) ?? null;
}

export function mountGlobalChecklistsPage({ locale }: { locale: Locale }) {
  const list = document.querySelector<HTMLElement>('[data-checklist-list]');
  const message = document.querySelector<HTMLElement>('[data-global-checklists-message]');
  const subscriptions = createSubscriptionScope();
  const checklistSubscriptions = createSubscriptionScope();
  let trips: TripRecord[] = [];
  let currentItemsByTrip: ChecklistItemsByTrip = new Map();

  if (!list || !ensureFirebaseReady(locale)) {
    return;
  }

  const sync = () => renderGlobalChecklists(locale, trips, currentItemsByTrip);

  window.addEventListener(
    'pagehide',
    () => {
      subscriptions.clear();
      checklistSubscriptions.clear();
    },
    { once: true },
  );

  observeSession((user) => {
    subscriptions.clear();
    checklistSubscriptions.clear();
    trips = [];
    currentItemsByTrip = new Map();
    sync();

    if (!user) {
      redirectHome(locale);
      return;
    }

    subscriptions.add(
      subscribeUserTrips(
        user.uid,
        (items) => {
          trips = items;
          subscribeTripsChecklistItems(trips, checklistSubscriptions, (itemsByTrip) => {
            currentItemsByTrip = itemsByTrip;
            sync();
          });
          revealAppShell();
        },
        () => {
          logTripsPermissionError(user);
          trips = [];
          currentItemsByTrip = new Map();
          sync();
          setMessage(message, getPageTranslator(locale)('firebase.permissionDenied'), 'danger');
          revealAppShell();
        },
      ),
    );
  });

  list.addEventListener('change', async (event) => {
    const toggle = event.target;

    if (!(toggle instanceof HTMLInputElement) || toggle.type !== 'checkbox') {
      return;
    }

    const checklistItemId = toggle.dataset.checklistToggle;
    const tripId = toggle.dataset.checklistTripId;

    if (!checklistItemId || !tripId) {
      return;
    }

    const checklistItem: ChecklistItemRecord | null = getChecklistItem(tripId, checklistItemId, currentItemsByTrip);

    if (!checklistItem) {
      return;
    }

    try {
      await updateTripChecklistItem(tripId, checklistItemId, {
        title: checklistItem.title,
        status: toggle.checked ? 'completed' : 'pending',
      });
    } catch (error) {
      toggle.checked = checklistItem.status === 'completed';
      setMessage(
        message,
        error instanceof Error ? error.message : getPageTranslator(locale)('tripChecklist.form.error'),
        'danger',
      );
    }
  });

  list.addEventListener('click', async (event) => {
    const removeButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-checklist-remove]',
    );

    if (!removeButton) {
      return;
    }

    const checklistItemId = removeButton.dataset.checklistRemove;
    const tripId = removeButton.dataset.checklistTripId;

    if (!checklistItemId || !tripId) {
      return;
    }

    removeButton.disabled = true;

    try {
      await deleteTripChecklistItem(tripId, checklistItemId);
    } catch (error) {
      removeButton.disabled = false;
      setMessage(
        message,
        error instanceof Error ? error.message : getPageTranslator(locale)('tripChecklist.form.error'),
        'danger',
      );
    }
  });
}
