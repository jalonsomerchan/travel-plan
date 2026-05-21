import type { Locale } from '../../config/site';
import { defaultTripPoiType } from '../../config/trip-pois';
import { escapeHtml, setButtonBusy, setMessage, showSnackbar } from '../../lib/app/dom';
import type { TripPointOfInterestInput, TripPointOfInterestRecord } from '../../lib/app/models';
import {
  getTripPoiDefaultColor,
  getTripPoiDefaultIcon,
  normalizeTripPoiColor,
  normalizeTripPoiType,
} from '../../lib/app/trip-pois';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { getAppUrl } from '../../lib/app/routes';
import {
  createTripPointOfInterest,
  deleteTripPointOfInterest,
  subscribeTripPointsOfInterest,
  updateTripPointOfInterest,
} from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { initLocationPickers } from './plan-location-picker';
import {
  ensureFirebaseReady,
  getPageTranslator,
  revealAppShell,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  setBreadcrumbItem,
  syncTripNavigation,
} from './shared';

function getFormInput(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
}

function getPoiInput(form: HTMLFormElement): TripPointOfInterestInput | null {
  const data = new FormData(form);
  const name = String(data.get('name') ?? '').trim();
  const description = String(data.get('description') ?? '').trim();
  const type = normalizeTripPoiType(String(data.get('type') ?? defaultTripPoiType));
  const icon = String(data.get('icon') ?? '').trim();
  const color = normalizeTripPoiColor(String(data.get('color') ?? ''), type);
  const isVisible = data.get('isVisible') === 'on';
  const locationName = String(data.get('locationName') ?? '').trim();
  const locationLat = Number(data.get('locationLat') ?? Number.NaN);
  const locationLng = Number(data.get('locationLng') ?? Number.NaN);

  if (!name || !locationName || !Number.isFinite(locationLat) || !Number.isFinite(locationLng)) {
    return null;
  }

  return {
    name,
    description,
    type,
    icon,
    color,
    isVisible,
    locationName,
    locationLat,
    locationLng,
  };
}

function resetForm(form: HTMLFormElement) {
  form.reset();

  const defaults: Record<string, string> = {
    pointId: '',
    type: defaultTripPoiType,
    icon: getTripPoiDefaultIcon(defaultTripPoiType),
    color: getTripPoiDefaultColor(defaultTripPoiType),
    locationName: '',
    locationLat: '',
    locationLng: '',
    locationQuery: '',
  };

  Object.entries(defaults).forEach(([name, value]) => {
    const input = getFormInput(form, name);

    if (input) {
      input.value = value;
    }
  });

  const visibleInput = getFormInput(form, 'isVisible');

  if (visibleInput instanceof HTMLInputElement) {
    visibleInput.checked = true;
  }

  form.dataset.poiMode = 'create';
  form.dataset.poiAutoIcon = getTripPoiDefaultIcon(defaultTripPoiType);
  form.dataset.poiAutoColor = getTripPoiDefaultColor(defaultTripPoiType);
  initLocationPickers();
}

function syncModalCopy(locale: Locale, form: HTMLFormElement) {
  const t = getPageTranslator(locale);
  const title = document.querySelector<HTMLElement>('[data-trip-poi-modal-title]');
  const description = document.querySelector<HTMLElement>('[data-trip-poi-modal-description]');
  const isEdit = form.dataset.poiMode === 'edit';

  if (title) {
    title.textContent = isEdit ? t('tripPois.modal.editTitle') : t('tripPois.modal.createTitle');
  }

  if (description) {
    description.textContent = isEdit ? t('tripPois.modal.editDescription') : t('tripPois.modal.createDescription');
  }
}

function renderPoiList(locale: Locale, points: TripPointOfInterestRecord[]) {
  const t = getPageTranslator(locale);
  const list = document.querySelector<HTMLElement>('[data-trip-poi-list]');
  const count = document.querySelector<HTMLElement>('[data-trip-poi-count]');

  if (count) {
    count.textContent = String(points.length);
  }

  if (!list) {
    return;
  }

  if (points.length === 0) {
    list.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripPois.empty'))}</article>`;
    return;
  }

  list.innerHTML = points
    .map(
      (point) => `
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow-[var(--shadow-xs)]" style="background:${escapeHtml(point.color)};">
                ${escapeHtml(resolveTripPoiIcon(point.icon, point.type))}
              </span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-[var(--color-text)]">${escapeHtml(point.name)}</h3>
                  <span class="rounded-full border border-[var(--color-border)] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">${escapeHtml(t(`tripPois.type.${point.type}`))}</span>
                  <span class="rounded-full px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] ${point.isVisible ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-surface-soft)] text-[var(--color-text-soft)]'}">${escapeHtml(point.isVisible ? t('tripPois.visibility.visible') : t('tripPois.visibility.hidden'))}</span>
                </div>
                ${point.description ? `<p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(point.description)}</p>` : ''}
                <p class="mt-2 break-words text-sm text-[var(--color-text-muted)]">${escapeHtml(point.locationName)}</p>
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <button class="app-card-link" data-trip-poi-edit="${escapeHtml(point.id)}" data-variant="secondary" type="button">${escapeHtml(t('common.edit'))}</button>
              <button class="app-card-link" data-trip-poi-delete="${escapeHtml(point.id)}" data-variant="danger" type="button">${escapeHtml(t('common.delete'))}</button>
            </div>
          </div>
        </article>
      `,
    )
    .join('');
}

function openPoiDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) {
    return;
  }

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closePoiDialog(dialog: HTMLDialogElement | null) {
  if (!dialog?.open) {
    return;
  }

  dialog.close();
}

function applyPoiToForm(form: HTMLFormElement, point: TripPointOfInterestRecord) {
  const values: Record<string, string> = {
    pointId: point.id,
    name: point.name,
    description: point.description,
    type: point.type,
    icon: point.icon,
    color: point.color,
    locationName: point.locationName,
    locationLat: String(point.locationLat),
    locationLng: String(point.locationLng),
    locationQuery: point.locationName,
  };

  Object.entries(values).forEach(([name, value]) => {
    const input = getFormInput(form, name);

    if (input) {
      input.value = value;
    }
  });

  const visibleInput = getFormInput(form, 'isVisible');

  if (visibleInput instanceof HTMLInputElement) {
    visibleInput.checked = point.isVisible;
  }

  form.dataset.poiMode = 'edit';
  form.dataset.poiAutoIcon = getTripPoiDefaultIcon(point.type);
  form.dataset.poiAutoColor = getTripPoiDefaultColor(point.type);
  initLocationPickers();
}

function syncPoiTypeDefaults(form: HTMLFormElement) {
  const typeInput = getFormInput(form, 'type');
  const iconInput = getFormInput(form, 'icon');
  const colorInput = getFormInput(form, 'color');

  if (!(typeInput instanceof HTMLSelectElement) || !(iconInput instanceof HTMLInputElement) || !(colorInput instanceof HTMLInputElement)) {
    return;
  }

  const type = normalizeTripPoiType(typeInput.value);
  const nextAutoIcon = getTripPoiDefaultIcon(type);
  const nextAutoColor = getTripPoiDefaultColor(type);
  const previousAutoIcon = form.dataset.poiAutoIcon ?? '';
  const previousAutoColor = form.dataset.poiAutoColor ?? '';

  if (!iconInput.value.trim() || iconInput.value === previousAutoIcon) {
    iconInput.value = nextAutoIcon;
  }

  if (!colorInput.value || colorInput.value.toLowerCase() === previousAutoColor.toLowerCase()) {
    colorInput.value = nextAutoColor;
  }

  form.dataset.poiAutoIcon = nextAutoIcon;
  form.dataset.poiAutoColor = nextAutoColor;
}

export function mountTripPoisPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-poi-form');
  const dialog = document.querySelector<HTMLDialogElement>('[data-trip-poi-dialog]');
  const formMessage = form?.querySelector<HTMLElement>('#trip-poi-message') ?? null;
  const pageMessage = document.querySelector<HTMLElement>('#trip-poi-page-message');
  const list = document.querySelector<HTMLElement>('[data-trip-poi-list]');
  const snackbar = document.querySelector<HTMLElement>('[data-trip-poi-snackbar]');
  const aiLink = document.querySelector<HTMLAnchorElement>('[data-trip-poi-ai-link]');
  const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const createButton = document.querySelector<HTMLButtonElement>('[data-trip-poi-open-create]');
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  let currentPoints: TripPointOfInterestRecord[] = [];

  if (!tripId || !form || !list) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);
  if (aiLink) {
    aiLink.href = getAppUrl(locale, 'trip-pois-ai', { trip: tripId });
  }
  resetForm(form);
  syncModalCopy(locale, form);

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closePoiDialog(dialog);
    }
  });

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();
    currentPoints = [];

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        if (!trip) {
          setAppShellTitle(t('trip.notFound'));
          setAppShellDescription('');
          setAppShellMeta([]);
          revealAppShell();
          return;
        }

        setAppShellTitle(t('tripPois.titleWithTrip').replace('{trip}', trip.name));
        setAppShellDescription(t('tripPois.description'));
        setAppShellMeta([trip.name]);
        setBreadcrumbItem('trip', trip.name, getAppUrl(locale, 'trip', { trip: trip.id }));
        revealAppShell();
        initLocationPickers();
      }),
    );

    subscriptions.add(
      subscribeTripPointsOfInterest(tripId, (points) => {
        currentPoints = points;
        renderPoiList(locale, points);
      }),
    );
  });

  createButton?.addEventListener('click', () => {
    resetForm(form);
    syncModalCopy(locale, form);
    setMessage(formMessage, t('tripPois.form.helper'));
    openPoiDialog(dialog);
    getFormInput(form, 'name')?.focus();
  });

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement | null;

    if (target?.matches('select[name="type"]')) {
      syncPoiTypeDefaults(form);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = getPoiInput(form);
    const pointId = String(new FormData(form).get('pointId') ?? '');
    const isEdit = Boolean(pointId);

    if (!input) {
      setMessage(formMessage, t('tripPois.form.locationRequired'), 'danger');
      return;
    }

    setButtonBusy(submitButton, true, t('tripPois.form.save'), t('common.saving'));

    try {
      if (isEdit) {
        await updateTripPointOfInterest(tripId, pointId, input);
        setMessage(pageMessage, t('tripPois.form.updated'), 'success');
      } else {
        await createTripPointOfInterest(tripId, input);
        setMessage(pageMessage, t('tripPois.form.created'), 'success');
        showSnackbar(snackbar, t('tripPois.form.created'), 'success');
      }

      closePoiDialog(dialog);
      resetForm(form);
      syncModalCopy(locale, form);
    } catch (error) {
      setMessage(formMessage, error instanceof Error ? error.message : t('tripPois.form.error'), 'danger');
    } finally {
      setButtonBusy(submitButton, false, t('tripPois.form.save'), t('common.saving'));
    }
  });

  document.querySelectorAll<HTMLElement>('[data-trip-poi-close]').forEach((button) => {
    button.addEventListener('click', () => {
      closePoiDialog(dialog);
      resetForm(form);
      syncModalCopy(locale, form);
      setMessage(formMessage, t('tripPois.form.helper'));
    });
  });

  list.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null;
    const editButton = target?.closest<HTMLButtonElement>('[data-trip-poi-edit]');
    const deleteButton = target?.closest<HTMLButtonElement>('[data-trip-poi-delete]');

    if (editButton) {
      const point = currentPoints.find((entry) => entry.id === editButton.dataset.tripPoiEdit);

      if (!point) {
        return;
      }

      applyPoiToForm(form, point);
      syncModalCopy(locale, form);
      setMessage(formMessage, t('tripPois.form.editing').replace('{name}', point.name));
      openPoiDialog(dialog);
      getFormInput(form, 'name')?.focus();
      return;
    }

    if (deleteButton) {
      const pointId = deleteButton.dataset.tripPoiDelete;

      if (!pointId) {
        return;
      }

      deleteButton.disabled = true;

      try {
        await deleteTripPointOfInterest(tripId, pointId);
      } catch (error) {
        deleteButton.disabled = false;
        setMessage(pageMessage, error instanceof Error ? error.message : t('tripPois.form.error'), 'danger');
      }
    }
  });
}
