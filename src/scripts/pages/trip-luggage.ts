import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import type { ChecklistItemRecord, TripRecord } from '../../lib/app/models';
import {
  createTripLuggageItem,
  deleteTripLuggageItem,
  subscribeTripLuggageItems,
  updateTripLuggageItem,
} from '../../lib/firebase/luggage';
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
  setNavigationLinkHidden,
  syncLuggageShell,
  syncTripNavigation,
} from './shared';

function getPendingLuggageCount(items: ChecklistItemRecord[]) {
  return items.filter((item) => item.status === 'pending').length;
}

function renderLuggageItems(locale: Locale, items: ChecklistItemRecord[]) {
  const target = document.querySelector<HTMLElement>('[data-luggage-list]');
  const pendingTarget = document.querySelector<HTMLElement>('[data-luggage-pending-count]');
  const completedTarget = document.querySelector<HTMLElement>('[data-luggage-completed-count]');
  const t = getPageTranslator(locale);
  const pendingCount = getPendingLuggageCount(items);
  const completedCount = items.length - pendingCount;

  if (pendingTarget) {
    pendingTarget.textContent = t('tripLuggage.pendingSummary').replace('{count}', String(pendingCount));
  }

  if (completedTarget) {
    completedTarget.textContent = t('tripLuggage.completedSummary').replace('{count}', String(completedCount));
  }

  if (!target) {
    return;
  }

  if (items.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripLuggage.empty'))}</article>`;
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
                  isCompleted ? t('tripLuggage.markPending') : t('tripLuggage.markCompleted'),
                )}"
                class="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                data-luggage-toggle="${escapeHtml(item.id)}"
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
              aria-label="${escapeHtml(t('tripLuggage.remove'))}"
              class="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              data-luggage-remove="${escapeHtml(item.id)}"
              type="button"
            >
              ${escapeHtml(t('tripLuggage.remove'))}
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

export function mountTripLuggagePage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-luggage-form');
  const message = document.querySelector<HTMLElement>('#trip-luggage-message');
  const list = document.querySelector<HTMLElement>('[data-luggage-list]');
  const privateOnly = document.querySelector<HTMLElement>('[data-trip-luggage-private-only]');
  const privateContent = document.querySelector<HTMLElement>('[data-trip-luggage-private-content]');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentItems: ChecklistItemRecord[] = [];
  let tripLoaded = false;
  let itemsLoaded = false;
  let isOwner = false;

  if (!tripId || !form || !list || !privateOnly || !privateContent) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);
  setNavigationLinkHidden('trip-luggage-link', true);

  const syncShell = () => {
    if (!currentTrip) {
      return;
    }

    syncLuggageShell(locale, currentTrip);

    if (!isOwner && tripLoaded) {
      privateOnly.hidden = false;
      privateContent.hidden = true;
      revealAppShell();
      return;
    }

    if (tripLoaded && itemsLoaded) {
      privateOnly.hidden = true;
      privateContent.hidden = false;
      revealAppShell();
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
      isOwner = Boolean(trip && trip.ownerId === user.uid);
      setNavigationLinkHidden('trip-luggage-link', !isOwner);

      if (trip) {
        if (!isOwner) {
          setAppShellTitle(t('tripLuggage.title'));
          setAppShellDescription(t('tripLuggage.privateOnly'));
          setAppShellMeta([trip.name]);
        }

        syncShell();
      } else {
        setAppShellTitle(t('trip.notFound'));
        setAppShellDescription('');
        setAppShellMeta([]);
        privateOnly.hidden = true;
        privateContent.hidden = true;
        revealAppShell();
      }
    });

    subscribeTripLuggageItems(
      tripId,
      (items) => {
        currentItems = items;
        itemsLoaded = true;
        renderLuggageItems(locale, items);
        syncShell();
      },
      () => {
        if (!isOwner && tripLoaded) {
          itemsLoaded = true;
          syncShell();
          return;
        }

        itemsLoaded = true;
        setMessage(message, t('firebase.permissionDenied'), 'danger');
        syncShell();
      },
    );
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!isOwner) {
      setMessage(message, t('tripLuggage.privateOnly'), 'danger');
      return;
    }

    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();

    if (!title) {
      return;
    }

    setButtonBusy(button, true, t('tripLuggage.form.add'), t('common.saving'));

    try {
      await createTripLuggageItem(tripId, {
        title,
        status: 'pending',
      });
      form.reset();
      setMessage(message, t('tripLuggage.form.created'), 'success');
    } catch (error) {
      setMessage(message, error instanceof Error ? error.message : t('tripLuggage.form.error'), 'danger');
    } finally {
      setButtonBusy(button, false, t('tripLuggage.form.add'), t('common.saving'));
    }
  });

  list.addEventListener('change', async (event) => {
    if (!isOwner) {
      return;
    }

    const toggle = event.target;

    if (!(toggle instanceof HTMLInputElement) || toggle.type !== 'checkbox') {
      return;
    }

    const luggageItemId = toggle.dataset.luggageToggle;

    if (!luggageItemId) {
      return;
    }

    const luggageItem = currentItems.find((item) => item.id === luggageItemId);

    if (!luggageItem) {
      return;
    }

    try {
      await updateTripLuggageItem(tripId, luggageItemId, {
        title: luggageItem.title,
        status: toggle.checked ? 'completed' : 'pending',
      });
    } catch (error) {
      toggle.checked = luggageItem.status === 'completed';
      setMessage(message, error instanceof Error ? error.message : t('tripLuggage.form.error'), 'danger');
    }
  });

  list.addEventListener('click', async (event) => {
    if (!isOwner) {
      return;
    }

    const removeButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-luggage-remove]');

    if (!removeButton) {
      return;
    }

    const luggageItemId = removeButton.dataset.luggageRemove;

    if (!luggageItemId) {
      return;
    }

    removeButton.disabled = true;

    try {
      await deleteTripLuggageItem(tripId, luggageItemId);
    } catch (error) {
      removeButton.disabled = false;
      setMessage(message, error instanceof Error ? error.message : t('tripLuggage.form.error'), 'danger');
    }
  });
}
