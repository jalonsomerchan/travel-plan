import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import type { ChecklistItemRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import {
  createTripChecklistItem,
  deleteTripChecklistItem,
  subscribeTripChecklistItems,
  updateTripChecklistItem,
} from '../../lib/firebase/checklists';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeChildTrips, subscribeTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getPageTranslator,
  revealAppShell,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  setTripContextName,
  syncChecklistShell,
  syncTripNavigation,
  syncTripParentNavigation,
} from './shared';
import {
  type ChecklistGroup,
  getCompletedChecklistCount,
  getPendingChecklistCount,
  renderChecklistGroups,
} from './trip-checklist-groups';
import { initListViewMode } from './list-view-mode';

export function mountTripChecklistPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-checklist-form');
  const message = document.querySelector<HTMLElement>('#trip-checklist-message');
  const list = document.querySelector<HTMLElement>('[data-checklist-list]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-checklist-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  const addLabel = t('tripChecklist.form.addShort');
  const subscriptions = createSubscriptionScope();
  const miniTripChecklistSubscriptions = createSubscriptionScope();
  let currentTrip: TripRecord | null = null;
  let currentItems: ChecklistItemRecord[] = [];
  let currentMiniTrips: TripRecord[] = [];
  let parentLookupToken = 0;
  let tripLoaded = false;
  let itemsLoaded = false;
  const miniTripChecklistItems = new Map<string, ChecklistItemRecord[]>();

  if (!tripId || !form || !list) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  initListViewMode(locale);
  syncTripNavigation(locale, tripId);

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  const getChecklistGroups = (): ChecklistGroup[] => [
    {
      isParentTrip: true,
      items: currentItems,
      tripId,
      tripName: currentTrip?.name ?? t('tripChecklist.group.currentTripFallback'),
    },
    ...currentMiniTrips.map((miniTrip) => ({
      isParentTrip: false,
      items: miniTripChecklistItems.get(miniTrip.id) ?? [],
      tripId: miniTrip.id,
      tripName: miniTrip.name,
    })),
  ];

  const syncParentNavigation = (trip: TripRecord | null) => {
    const fallbackHref = getAppUrl(locale, 'trip', { trip: tripId });

    if (!trip?.parentTripId) {
      syncTripParentNavigation(locale, null, fallbackHref);
      return;
    }

    const lookupToken = parentLookupToken + 1;
    parentLookupToken = lookupToken;

    void getTripOnce(trip.parentTripId)
      .then((parentTrip) => {
        if (lookupToken !== parentLookupToken) {
          return;
        }

        syncTripParentNavigation(
          locale,
          parentTrip ? { id: parentTrip.id, name: parentTrip.name } : null,
          fallbackHref,
        );
      })
      .catch(() => {
        if (lookupToken !== parentLookupToken) {
          return;
        }

        syncTripParentNavigation(locale, null, fallbackHref);
      });
  };

  const syncShell = () => {
    if (!currentTrip) {
      return;
    }

    const groups = getChecklistGroups();
    syncChecklistShell(
      locale,
      currentTrip,
      getPendingChecklistCount(groups),
      getCompletedChecklistCount(groups),
    );

    if (tripLoaded && itemsLoaded) {
      revealAppShell();
    }
  };

  const syncMiniTripChecklistSubscriptions = () => {
    miniTripChecklistSubscriptions.clear();
    miniTripChecklistItems.clear();

    currentMiniTrips.forEach((miniTrip) => {
      miniTripChecklistSubscriptions.add(
        subscribeTripChecklistItems(miniTrip.id, (items) => {
          miniTripChecklistItems.set(miniTrip.id, items);
          renderChecklistGroups(locale, getChecklistGroups());
          syncShell();
        }),
      );
    });

    renderChecklistGroups(locale, getChecklistGroups());
    syncShell();
  };

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });
  window.addEventListener('pagehide', () => miniTripChecklistSubscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();
    miniTripChecklistSubscriptions.clear();
    currentTrip = null;
    currentItems = [];
    currentMiniTrips = [];
    tripLoaded = false;
    itemsLoaded = false;
    parentLookupToken += 1;
    miniTripChecklistItems.clear();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        currentTrip = trip;
        tripLoaded = true;

        if (trip) {
          syncParentNavigation(trip);
          syncShell();
        } else {
          syncParentNavigation(null);
          setTripContextName('');
          setAppShellTitle(t('trip.notFound'));
          setAppShellDescription('');
          setAppShellMeta([]);
          revealAppShell();
        }
      }),
    );

    subscriptions.add(
      subscribeTripChecklistItems(tripId, (items) => {
        currentItems = items;
        itemsLoaded = true;
        renderChecklistGroups(locale, getChecklistGroups());
        syncShell();
      }),
    );

    subscriptions.add(
      subscribeChildTrips(tripId, (miniTrips) => {
        currentMiniTrips = miniTrips;
        syncMiniTripChecklistSubscriptions();
      }),
    );
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const titleInput = form.elements.namedItem('title') as HTMLInputElement | null;

    if (!title) {
      return;
    }

    setButtonBusy(button, true, addLabel, t('common.saving'));
    form.reset();
    setButtonBusy(button, false, addLabel, t('common.saving'));
    titleInput?.focus();

    void createTripChecklistItem(tripId, {
      title,
      status: 'pending',
    })
      .then(() => {
        setMessage(message, t('tripChecklist.form.created'), 'success');
      })
      .catch((error) => {
        if (titleInput && !titleInput.value.trim()) {
          titleInput.value = title;
          titleInput.focus();
        }

        setMessage(message, error instanceof Error ? error.message : t('tripChecklist.form.error'), 'danger');
      });
  });

  list.addEventListener('change', async (event) => {
    const toggle = event.target;

    if (!(toggle instanceof HTMLInputElement) || toggle.type !== 'checkbox') {
      return;
    }

    const checklistItemId = toggle.dataset.checklistToggle;
    const checklistTripId = toggle.dataset.checklistTripId ?? tripId;

    if (!checklistItemId) {
      return;
    }

    const checklistItem =
      (checklistTripId === tripId ? currentItems : miniTripChecklistItems.get(checklistTripId) ?? []).find(
        (item) => item.id === checklistItemId,
      ) ?? null;

    if (!checklistItem) {
      return;
    }

    try {
      await updateTripChecklistItem(checklistTripId, checklistItemId, {
        title: checklistItem.title,
        status: toggle.checked ? 'completed' : 'pending',
      });
    } catch (error) {
      toggle.checked = checklistItem.status === 'completed';
      setMessage(message, error instanceof Error ? error.message : t('tripChecklist.form.error'), 'danger');
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
    const checklistTripId = removeButton.dataset.checklistTripId ?? tripId;

    if (!checklistItemId) {
      return;
    }

    removeButton.disabled = true;

    try {
      await deleteTripChecklistItem(checklistTripId, checklistItemId);
    } catch (error) {
      removeButton.disabled = false;
      setMessage(message, error instanceof Error ? error.message : t('tripChecklist.form.error'), 'danger');
    }
  });
}
