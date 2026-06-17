import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import {
  countGlobalSearchResults,
  createGlobalSearchText,
  filterGlobalSearchDocuments,
  globalSearchResultTypes,
  type GlobalSearchDocument,
  type GlobalSearchResultType,
} from '../../lib/app/global-search';
import { escapeHtml } from '../../lib/app/dom';
import { formatDateRange, formatPlanMoment } from '../../lib/app/format';
import type { ChecklistItemRecord, PlanRecord, TripPoiRecord, TripRecord } from '../../lib/app/models';
import { getPlanLocationLabel } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { getTripChecklistItemsOnce, getTripPoisOnce } from '../../lib/firebase/global-search-reads';
import { getTripPlansOnce } from '../../lib/firebase/plan-reads';
import { observeSession } from '../../lib/firebase/session';
import { fetchUserTripsDirect } from '../../lib/firebase/trip-rest';
import {
  getCategoryLabel,
  getChecklistStatusLabel,
  getPageTranslator,
  getPlanStatusLabel,
  getTripStatusLabel,
} from './shared';

interface TripSearchCollections {
  trip: TripRecord;
  plans: PlanRecord[];
  pois: TripPoiRecord[];
  checklist: ChecklistItemRecord[];
}

interface GlobalSearchIndex {
  documents: GlobalSearchDocument[];
}

function compactMeta(items: Array<string | undefined | null>) {
  return items.map((item) => item?.trim() ?? '').filter(Boolean);
}

function buildTripDocument(locale: Locale, trip: TripRecord): GlobalSearchDocument {
  const statusLabel = getTripStatusLabel(locale, trip.status);
  const dateLabel = formatDateRange(trip.startDate, trip.endDate, locale);

  return {
    id: `trip:${trip.id}`,
    type: 'trip',
    title: trip.name,
    subtitle: trip.location,
    meta: compactMeta([dateLabel, statusLabel]),
    url: getAppUrl(locale, 'trip', { trip: trip.id }),
    searchText: createGlobalSearchText([trip.name, trip.location, dateLabel, statusLabel]),
  };
}

function buildPlanDocument(locale: Locale, trip: TripRecord, plan: PlanRecord): GlobalSearchDocument {
  const categoryLabel = getCategoryLabel(locale, plan.category);
  const statusLabel = getPlanStatusLabel(locale, plan.status);
  const momentLabel = formatPlanMoment(plan, locale);
  const locationLabel = getPlanLocationLabel(plan);

  return {
    id: `plan:${trip.id}:${plan.id}`,
    type: 'plan',
    title: plan.name,
    subtitle: trip.name,
    meta: compactMeta([categoryLabel, statusLabel, momentLabel, locationLabel]),
    url: getAppUrl(locale, 'plan', { trip: trip.id, plan: plan.id }),
    searchText: createGlobalSearchText([
      trip.name,
      trip.location,
      plan.name,
      plan.description,
      categoryLabel,
      statusLabel,
      momentLabel,
      locationLabel,
    ]),
  };
}

function buildPoiDocument(locale: Locale, trip: TripRecord, point: TripPoiRecord): GlobalSearchDocument {
  const typeLabel = getPageTranslator(locale)(`tripPois.type.${point.type}`);

  return {
    id: `poi:${trip.id}:${point.id}`,
    type: 'poi',
    title: point.name,
    subtitle: trip.name,
    meta: compactMeta([typeLabel, point.locationName, point.isVisible ? '' : getPageTranslator(locale)('tripPois.visibility.hidden')]),
    url: getAppUrl(locale, 'trip-pois', { trip: trip.id }),
    searchText: createGlobalSearchText([
      trip.name,
      trip.location,
      point.name,
      point.description,
      typeLabel,
      point.locationName,
    ]),
  };
}

function buildChecklistDocument(locale: Locale, trip: TripRecord, item: ChecklistItemRecord): GlobalSearchDocument {
  const statusLabel = getChecklistStatusLabel(locale, item.status);

  return {
    id: `checklist:${trip.id}:${item.id}`,
    type: 'checklist',
    title: item.title,
    subtitle: trip.name,
    meta: compactMeta([statusLabel]),
    url: getAppUrl(locale, 'trip-checklist', { trip: trip.id }),
    searchText: createGlobalSearchText([trip.name, trip.location, item.title, statusLabel]),
  };
}

function buildSearchIndex(locale: Locale, collections: TripSearchCollections[]): GlobalSearchIndex {
  return {
    documents: collections.flatMap(({ trip, plans, pois, checklist }) => [
      buildTripDocument(locale, trip),
      ...plans.map((plan) => buildPlanDocument(locale, trip, plan)),
      ...pois.map((point) => buildPoiDocument(locale, trip, point)),
      ...checklist.map((item) => buildChecklistDocument(locale, trip, item)),
    ]),
  };
}

async function readTripCollections(trip: TripRecord): Promise<TripSearchCollections> {
  const [plans, pois, checklist] = await Promise.all([
    getTripPlansOnce(trip.id).catch(() => []),
    getTripPoisOnce(trip.id).catch(() => []),
    getTripChecklistItemsOnce(trip.id).catch(() => []),
  ]);

  return { trip, plans, pois, checklist };
}

async function loadSearchIndex(locale: Locale, user: User) {
  const trips = await fetchUserTripsDirect(user);
  const collections = await Promise.all(trips.map(readTripCollections));

  return buildSearchIndex(locale, collections);
}

function renderResultCard(document: GlobalSearchDocument, typeLabel: string) {
  const meta = document.meta.length
    ? `<p class="mt-2 text-xs font-semibold text-[var(--color-text-soft)]">${escapeHtml(document.meta.join(' · '))}</p>`
    : '';
  const subtitle = document.subtitle
    ? `<p class="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">${escapeHtml(document.subtitle)}</p>`
    : '';

  return `
    <a class="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" href="${escapeHtml(document.url)}">
      <span class="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">${escapeHtml(typeLabel)}</span>
      <strong class="mt-1 block text-base leading-tight text-[var(--color-text)]">${escapeHtml(document.title)}</strong>
      ${subtitle}
      ${meta}
    </a>
  `;
}

function renderResults(locale: Locale, index: GlobalSearchIndex, query: string) {
  const t = getPageTranslator(locale);
  const results = document.querySelector<HTMLElement>('[data-global-search-results]');
  const status = document.querySelector<HTMLElement>('[data-global-search-status]');

  if (!results || !status) {
    return;
  }

  const groups = filterGlobalSearchDocuments(index.documents, query);
  const count = countGlobalSearchResults(groups);

  if (count === 0) {
    status.textContent = t('globalSearch.empty').replace('{query}', query.trim());
    results.innerHTML = '';
    return;
  }

  status.textContent = t('globalSearch.resultsSummary')
    .replace('{count}', String(count))
    .replace('{query}', query.trim());

  results.innerHTML = globalSearchResultTypes
    .map((type) => renderResultGroup(locale, type, groups[type]))
    .filter(Boolean)
    .join('');
}

function renderResultGroup(locale: Locale, type: GlobalSearchResultType, documents: GlobalSearchDocument[]) {
  if (documents.length === 0) {
    return '';
  }

  const t = getPageTranslator(locale);
  const title = t(`globalSearch.group.${type}`);
  const typeLabel = t(`globalSearch.type.${type}`);

  return `
    <section class="grid gap-3" aria-label="${escapeHtml(title)}">
      <h3 class="text-sm font-black uppercase tracking-[0.14em] text-[var(--color-text-soft)]">${escapeHtml(title)}</h3>
      <div class="grid gap-2 sm:grid-cols-2">
        ${documents.map((document) => renderResultCard(document, typeLabel)).join('')}
      </div>
    </section>
  `;
}

export function mountDashboardGlobalSearch({ locale }: { locale: Locale }) {
  const input = document.querySelector<HTMLInputElement>('[data-global-search-input]');
  const results = document.querySelector<HTMLElement>('[data-global-search-results]');
  const status = document.querySelector<HTMLElement>('[data-global-search-status]');
  let user: User | null = null;
  let index: GlobalSearchIndex | null = null;
  let loadPromise: Promise<GlobalSearchIndex> | null = null;
  let debounceId = 0;
  let requestId = 0;

  if (!input || !results || !status) {
    return;
  }

  const t = getPageTranslator(locale);

  function setIdle() {
    status.textContent = t('globalSearch.hint');
    results.innerHTML = '';
  }

  function setLoading() {
    status.textContent = t('globalSearch.loading');
    results.innerHTML = '';
  }

  function setError() {
    status.textContent = t('globalSearch.error');
    results.innerHTML = '';
  }

  async function getIndex() {
    if (index) {
      return index;
    }

    if (!user) {
      throw new Error('No authenticated user available for global search.');
    }

    if (!loadPromise) {
      loadPromise = loadSearchIndex(locale, user);
    }

    index = await loadPromise;
    return index;
  }

  async function sync() {
    const currentRequest = ++requestId;
    const query = input?.value ?? '';

    if (query.trim().length < 2) {
      setIdle();
      return;
    }

    setLoading();

    try {
      const nextIndex = await getIndex();

      if (currentRequest !== requestId) {
        return;
      }

      renderResults(locale, nextIndex, query);
    } catch (error) {
      console.error('dashboardGlobalSearch', error);
      setError();
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => void sync(), 200);
  });

  observeSession((nextUser) => {
    user = nextUser;
    index = null;
    loadPromise = null;
    setIdle();
  });

  setIdle();
}
