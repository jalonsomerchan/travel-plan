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
  setTripContextName,
  syncTripNavigation,
} from './shared';
import { ensureListViewToggle, initListViewMode } from './list-view-mode';

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

  ensureListViewToggle(locale, list);

  if (points.length === 0) {
    list.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripPois.empty'))}</article>`;
    return;
  }

  list.innerHTML = points
    .map(
      (point) => `
        <article class="app-card-shell min-w-0 overflow-hidden" data-list-card>
          <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
            <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow-[var(--shadow-xs)]" style="background:${escapeHtml(point.color)};">
              ${escapeHtml(resolveTripPoiIcon(point.icon, point.type))}
            </span>
            <div class="min-w-0">
              <div class="flex min-w-0 flex-wrap items-center gap-3">
                <h3 class="min-w-0 break-words text-lg font-bold leading-tight text-[var(--color-text)] [overflow-wrap:anywhere]">${escapeHtml(point.name)}</h3>
                <span class="rounded-full border border-[var(--color-border)] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-soft)]" data-list-detail>${escapeHtml(t(`tripPois.type.${point.type}`))}</span>
                <span class="status-pill" data-list-detail data-tone="${point.isVisible ? 'success' : 'warning'}">${escapeHtml(point.isVisible ? t('tripPois.visibility.visible') : t('tripPois.visibility.hidden'))}</span>
              </div>
            </div>
            <details class="app-actions-menu">
              <summary aria-label="${escapeHtml(t('tripPois.actions'))}" class="app-actions-menu-trigger" title="${escapeHtml(t('tripPois.actions'))}">
                ⋮
              </summary>
              <div class="app-actions-menu-panel">
                <button class="app-actions-menu-link app-actions-menu-button" data-trip-poi-edit="${escapeHtml(point.id)}" type="button">
                  ${escapeHtml(t('common.edit'))}
                </button>
                <button class="app-actions-menu-link app-actions-menu-button" data-trip-poi-visibility-toggle="${escapeHtml(point.id)}" type="button">
                  ${escapeHtml(point.isVisible ? t('tripPois.actions.hide') : t('tripPois.actions.show'))}
                </button>
                <button class="app-actions-menu-link app-actions-menu-button" data-trip-poi-delete="${escapeHtml(point.id)}" type="button">
                  ${escapeHtml(t('common.delete'))}
                </button>
              </div>
            </details>
          </div>
          ${point.description ? `<p class="mt-3 w-full break-words text-sm text-[var(--color-text-soft)] [overflow-wrap:anywhere]" data-list-detail>${escapeHtml(point.description)}</p>` : ''}
          <p class="mt-3 w-full break-words text-sm text-[var(--color-text-muted)] [overflow-wrap:anywhere]" data-list-detail>${escapeHtml(point.locationName)}</p>
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

  initListViewMode(locale);
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
          setTripContextName('');
          setAppShellTitle(t('trip.notFound'));
          setAppShellDescription('');
          setAppShellMeta([]);
          revealAppShell();
          return;
        }

        setTripContextName(trip.name);
        setAppShellTitle(t('tripPois.title'));
        setAppShellDescription(t('tripPois.description'));
        setAppShellMeta([]);
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
    const visibilityButton = target?.closest<HTMLButtonElement>('[data-trip-poi-visibility-toggle]');

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

    if (visibilityButton) {
      const pointId = visibilityButton.dataset.tripPoiVisibilityToggle;
      const point = currentPoints.find((entry) => entry.id === pointId);

      if (!point) {
        return;
      }

      visibilityButton.disabled = true;

      try {
        await updateTripPointOfInterest(tripId, point.id, {
          name: point.name,
          description: point.description,
          type: point.type,
          icon: point.icon,
          color: point.color,
          isVisible: !point.isVisible,
          locationName: point.locationName,
          locationLat: point.locationLat,
          locationLng: point.locationLng,
        });
      } catch (error) {
        visibilityButton.disabled = false;
        setMessage(pageMessage, error instanceof Error ? error.message : t('tripPois.form.error'), 'danger');
      }

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
