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

export function ensureListViewToggle(locale: Locale, list: HTMLElement | null) {
  if (!list || list.previousElementSibling?.hasAttribute('data-list-view-toolbar')) {
    return;
  }

  const t = getPageTranslator(locale);
  const toolbar = document.createElement('div');
  toolbar.dataset.listViewToolbar = 'true';
  toolbar.className = 'list-view-toolbar';
  toolbar.innerHTML = `
    <span class="list-view-toolbar__label">${t('listView.label')}</span>
    <button class="list-view-toolbar__button" data-list-view-toggle type="button"></button>
  `;

  const button = toolbar.querySelector<HTMLButtonElement>('[data-list-view-toggle]');
  button?.addEventListener('click', () => setListViewMode(getNextMode()));
  list.before(toolbar);
  syncToggleLabels(locale);
}
