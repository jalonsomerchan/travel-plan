import type { Locale } from '../../config/site';
import { getPageTranslator } from './shared';

type ListViewMode = 'detailed' | 'compact';

const storageKey = 'travel-plan:list-view-mode';
const eventName = 'travel-plan:list-view-mode-change';

function isListViewMode(value: string | null): value is ListViewMode {
  return value === 'detailed' || value === 'compact';
}

export function getListViewMode(): ListViewMode {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isListViewMode(stored) ? stored : 'detailed';
  } catch {
    return 'detailed';
  }
}

function setListViewMode(mode: ListViewMode) {
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Private browsing or blocked storage should not break list rendering.
  }

  document.documentElement.dataset.listViewMode = mode;
  window.dispatchEvent(new CustomEvent(eventName, { detail: mode }));
}

function getNextMode() {
  return getListViewMode() === 'compact' ? 'detailed' : 'compact';
}

function syncToggleLabels(locale: Locale) {
  const t = getPageTranslator(locale);
  const mode = getListViewMode();
  const nextMode = getNextMode();

  document.querySelectorAll<HTMLButtonElement>('[data-list-view-toggle]').forEach((button) => {
    button.dataset.mode = mode;
    button.textContent = t(nextMode === 'compact' ? 'listView.showCompact' : 'listView.showDetailed');
    button.setAttribute(
      'aria-label',
      t(nextMode === 'compact' ? 'listView.showCompactAria' : 'listView.showDetailedAria'),
    );
  });
}

export function initListViewMode(locale: Locale) {
  document.documentElement.dataset.listViewMode = getListViewMode();
  syncToggleLabels(locale);

  window.addEventListener(eventName, () => syncToggleLabels(locale));
}

function getToolbarInsertionTarget(list: HTMLElement) {
  const tripFiltersForm = document.querySelector<HTMLFormElement>('[data-plan-filters]');

  if (tripFiltersForm?.parentElement) {
    return {
      parent: tripFiltersForm.parentElement,
      before: tripFiltersForm,
    };
  }

  return {
    parent: list.parentElement,
    before: list,
  };
}

function moveTripFiltersToggle(toolbar: HTMLElement) {
  const filtersToggle = document.querySelector<HTMLButtonElement>('[data-plan-filters-toggle]');
  const filtersSlot = toolbar.querySelector<HTMLElement>('[data-list-view-filter-slot]');

  if (!filtersToggle || !filtersSlot) {
    return;
  }

  filtersSlot.append(filtersToggle);
}

export function ensureListViewToggle(locale: Locale, list: HTMLElement | null) {
  if (!list || document.querySelector('[data-list-view-toolbar]')) {
    return;
  }

  const t = getPageTranslator(locale);
  const toolbar = document.createElement('div');
  toolbar.dataset.listViewToolbar = 'true';
  toolbar.className = 'list-view-toolbar';
  toolbar.innerHTML = `
    <div class="list-view-toolbar__filters" data-list-view-filter-slot></div>
    <div class="list-view-toolbar__view">
      <span class="list-view-toolbar__label">${t('listView.label')}</span>
      <button class="list-view-toolbar__button" data-list-view-toggle type="button"></button>
    </div>
  `;

  const button = toolbar.querySelector<HTMLButtonElement>('[data-list-view-toggle]');
  const insertionTarget = getToolbarInsertionTarget(list);

  button?.addEventListener('click', () => setListViewMode(getNextMode()));
  moveTripFiltersToggle(toolbar);
  insertionTarget.parent?.insertBefore(toolbar, insertionTarget.before);
  syncToggleLabels(locale);
}
