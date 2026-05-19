import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import type { ChecklistItemRecord, TripRecord } from '../../lib/app/models';
import { getAppUrl } from '../../lib/app/routes';
import {
  createTripChecklistItem,
  deleteTripChecklistItem,
  subscribeTripChecklistItems,
  updateTripChecklistItem,
} from '../../lib/firebase/checklists';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getChecklistStatusLabel,
  getChecklistStatusTone,
  getPageTranslator,
  revealAppShell,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  syncTripNavigation,
  syncChecklistShell,
} from './shared';

function getPendingChecklistCount(items: ChecklistItemRecord[]) {
  return items.filter((item) => item.status === 'pending').length;
}

function renderChecklistItems(locale: Locale, items: ChecklistItemRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-checklist-list]');
  const pendingTarget = document.querySelector<HTMLElement>('[data-checklist-pending-count]');
  const completedTarget = document.querySelector<HTMLElement>('[data-checklist-completed-count]');
  const t = getPageTranslator(locale);
  const pendingCount = getPendingChecklistCount(items);
  const completedCount = items.length - pendingCount;

  if (pendingTarget) {
    pendingTarget.textContent = t('tripChecklist.pendingSummary').replace('{count}', String(pendingCount));
  }

  if (completedTarget) {
    completedTarget.textContent = t('tripChecklist.completedSummary').replace('{count}', String(completedCount));
  }

  if (!target) {
    return;
  }

  if (items.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripChecklist.empty'))}</article>`;
    return;
  }

  target.innerHTML = items
    .map((item) => {
      const isCompleted = item.status === 'completed';

      return `
        <article class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-4">
          <div class="flex items-start justify-between gap-3">
            <label class="flex min-w-0 flex-1 items-start gap-3">
              <input
                ${isCompleted ? 'checked' : ''}
                aria-label="${escapeHtml(
                  isCompleted ? t('tripChecklist.markPending') : t('tripChecklist.markCompleted'),
                )}"
                class="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                data-checklist-toggle="${escapeHtml(item.id)}"
                type="checkbox"
              />
              <span class="min-w-0">
                <span class="block font-semibold text-[var(--color-text)] ${isCompleted ? 'line-through opacity-70' : ''}">
                  ${escapeHtml(item.title)}
                </span>
                <span class="mt-1 inline-flex">
                  <span class="status-pill" data-tone="${getChecklistStatusTone(item.status)}">${escapeHtml(
                    getChecklistStatusLabel(locale, item.status),
                  )}</span>
                </span>
              </span>
            </label>
            <button
              aria-label="${escapeHtml(t('tripChecklist.remove'))}"
              class="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              data-checklist-remove="${escapeHtml(item.id)}"
              type="button"
            >
              ${escapeHtml(t('tripChecklist.remove'))}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

export function mountTripChecklistPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-checklist-form');
  const message = document.querySelector<HTMLElement>('#trip-checklist-message');
  const list = document.querySelector<HTMLElement>('[data-checklist-list]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-checklist-back-link');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentItems: ChecklistItemRecord[] = [];
  let tripLoaded = false;
  let itemsLoaded = false;

  if (!tripId || !form || !list) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  const syncShell = () => {
    if (currentTrip) {
      syncChecklistShell(
        locale,
        currentTrip,
        getPendingChecklistCount(currentItems),
        currentItems.length - getPendingChecklistCount(currentItems),
      );

      if (tripLoaded && itemsLoaded) {
        revealAppShell();
      }
    }
  };

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;
      tripLoaded = true;

      if (trip) {
        syncShell();
      } else {
        setAppShellTitle(t('trip.notFound'));
        setAppShellDescription('');
        setAppShellMeta([]);
        revealAppShell();
      }
    });

    subscribeTripChecklistItems(tripId, (items) => {
      currentItems = items;
      itemsLoaded = true;
      renderChecklistItems(locale, items);
      syncShell();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();

    if (!title) {
      return;
    }

    setButtonBusy(button, true, t('tripChecklist.form.add'), t('common.saving'));

    try {
      await createTripChecklistItem(tripId, {
        title,
        status: 'pending',
      });
      form.reset();
      setMessage(message, t('tripChecklist.form.created'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('tripChecklist.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('tripChecklist.form.add'), t('common.saving'));
    }
  });

  list.addEventListener('change', async (event) => {
    const toggle = event.target;

    if (!(toggle instanceof HTMLInputElement) || toggle.type !== 'checkbox') {
      return;
    }

    const checklistItemId = toggle.dataset.checklistToggle;

    if (!checklistItemId) {
      return;
    }

    const checklistItem = currentItems.find((item) => item.id === checklistItemId);

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

    if (!checklistItemId) {
      return;
    }

    removeButton.disabled = true;

    try {
      await deleteTripChecklistItem(tripId, checklistItemId);
    } catch (error) {
      removeButton.disabled = false;
      setMessage(message, error instanceof Error ? error.message : t('tripChecklist.form.error'), 'danger');
    }
  });
}
