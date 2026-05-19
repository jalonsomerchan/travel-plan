import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getGoogleMapsPlaceUrlFromCoordinates,
  getOpenStreetMapPlaceUrlFromCoordinates,
} from '../../lib/app/location-links';
import {
  type NearbyPoiCategoryId,
  type NearbyPoiResult,
  NearbyPoiError,
  getNearbyPoiCategories,
  getNearbyPoiDefaultCategoryIds,
  searchNearbyPois,
} from '../../lib/app/poi';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance } from '../../lib/app/format';
import { useTranslations } from '../../i18n/ui';
import { addMapLayerSelector } from '../maps/layers';

interface ExplorerSourceContext {
  latitude?: number;
  longitude?: number;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionHref?: string;
}

interface ExplorerState {
  source: ExplorerSourceContext;
  radiusMeters: number;
  categoryIds: NearbyPoiCategoryId[];
  results: NearbyPoiResult[];
  truncated: boolean;
}

function debounce<T extends (...args: never[]) => void>(callback: T, delayMs: number) {
  let timeoutId = 0;

  return (...args: Parameters<T>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  };
}

function getErrorMessage(error: unknown, t: ReturnType<typeof useTranslations>) {
  if (error instanceof NearbyPoiError) {
    if (error.code === 'rate_limited') {
      return t('poi.error.rateLimited');
    }

    if (error.code === 'timeout') {
      return t('poi.error.timeout');
    }
  }

  return t('poi.error.generic');
}

function createSourceMarker(label: string) {
  return L.divIcon({
    className: 'nearby-poi-source-marker',
    html: `
      <span aria-hidden="true" style="align-items:center;background:#0f766e;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;height:38px;justify-content:center;width:38px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" fill="currentColor"/>
          <circle cx="12" cy="10" r="2.8" fill="#ffffff"/>
        </svg>
      </span>
    `,
    iconAnchor: [19, 38],
    iconSize: [38, 38],
    popupAnchor: [0, -38],
  });
}

export function mountNearbyPoiExplorer(root: HTMLElement, { locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const count = root.querySelector<HTMLElement>('[data-nearby-poi-count]');
  const list = root.querySelector<HTMLElement>('[data-nearby-poi-list]');
  const status = root.querySelector<HTMLElement>('[data-nearby-poi-status]');
  const radiusSelect = root.querySelector<HTMLSelectElement>('[data-nearby-poi-radius]');
  const categoryInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('[data-nearby-poi-category]'),
  );
  const emptyState = root.querySelector<HTMLElement>('[data-nearby-poi-empty-state]');
  const emptyTitle = root.querySelector<HTMLElement>('[data-nearby-poi-empty-title]');
  const emptyDescription = root.querySelector<HTMLElement>('[data-nearby-poi-empty-description]');
  const emptyAction = root.querySelector<HTMLAnchorElement>('[data-nearby-poi-empty-action]');
  const mapTarget = root.querySelector<HTMLElement>('[data-nearby-poi-map]');
  const showMap = root.dataset.showMap === 'true';
  const state: ExplorerState = {
    source: {
      label: '',
      emptyTitle: '',
      emptyDescription: '',
    },
    radiusMeters: Number(radiusSelect?.value ?? 1000),
    categoryIds: getNearbyPoiDefaultCategoryIds(),
    results: [],
    truncated: false,
  };
  let map: L.Map | null = null;
  let markers: L.LayerGroup | null = null;
  let currentAbortController: AbortController | null = null;

  const categoryLookup = new Map(getNearbyPoiCategories().map((category) => [category.id, category]));

  const ensureMap = () => {
    if (!showMap || !mapTarget || map) {
      return;
    }

    map = L.map(mapTarget, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([40.4168, -3.7038], 13);
    addMapLayerSelector(map, t);
    markers = L.layerGroup().addTo(map);
  };

  const setStatus = (message: string, tone: 'warning' | 'success' | 'danger' = 'warning') => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.tone = tone;
  };

  const setCount = (value: number, tone: 'warning' | 'primary' = 'warning') => {
    if (!count) {
      return;
    }

    count.textContent = String(value);
    count.dataset.tone = tone;
  };

  const renderEmptyState = () => {
    emptyState?.removeAttribute('hidden');
    if (emptyTitle) {
      emptyTitle.textContent = state.source.emptyTitle;
    }
    if (emptyDescription) {
      emptyDescription.textContent = state.source.emptyDescription;
    }
    if (emptyAction) {
      if (state.source.emptyActionHref) {
        emptyAction.hidden = false;
        emptyAction.href = state.source.emptyActionHref;
      } else {
        emptyAction.hidden = true;
      }
    }
    if (list) {
      list.innerHTML = '';
    }
    markers?.clearLayers();
    setCount(0, 'warning');
    setStatus('');
  };

  const renderResults = () => {
    if (!list) {
      return;
    }

    emptyState?.setAttribute('hidden', '');

    if (state.results.length === 0) {
      list.innerHTML = `
        <article class="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">
          ${escapeHtml(t('poi.empty'))}
        </article>
      `;
      setCount(0, 'warning');
      setStatus(t('poi.empty'));
      markers?.clearLayers();
      return;
    }

    setCount(state.results.length, 'primary');
    setStatus(
      state.truncated ? t('poi.tooMany') : t('poi.resultsCount').replace('{count}', String(state.results.length)),
      state.truncated ? 'warning' : 'success',
    );

    list.innerHTML = state.results
      .map((poi) => {
        const category = categoryLookup.get(poi.categoryId);
        const categoryLabel = category ? t(category.labelKey) : poi.categoryId;

        return `
          <article class="app-card-shell p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-[var(--color-text)]">${escapeHtml(
                  poi.name || categoryLabel,
                )}</h3>
                <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(categoryLabel)}</p>
              </div>
              <span class="status-pill" data-tone="primary">${escapeHtml(
                formatDistance(poi.distanceKm, locale),
              )}</span>
            </div>
            <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(poi.coordinatesLabel)}</p>
            <div class="mt-5 flex flex-wrap gap-3">
              ${
                showMap
                  ? `<button class="app-card-link" data-variant="secondary" data-nearby-poi-focus="${escapeHtml(
                      poi.id,
                    )}" type="button">${escapeHtml(t('poi.focusOnMap'))}</button>`
                  : ''
              }
              <a class="app-card-link" data-variant="secondary" href="${escapeHtml(
                getOpenStreetMapPlaceUrlFromCoordinates(poi.latitude, poi.longitude),
              )}" rel="noopener noreferrer" target="_blank">${escapeHtml(t('poi.openStreetMap'))}</a>
              <a class="app-card-link" data-variant="secondary" href="${escapeHtml(
                getGoogleMapsPlaceUrlFromCoordinates(poi.latitude, poi.longitude),
              )}" rel="noopener noreferrer" target="_blank">${escapeHtml(t('poi.openGoogleMaps'))}</a>
            </div>
          </article>
        `;
      })
      .join('');

    if (map && markers && state.source.latitude !== undefined && state.source.longitude !== undefined) {
      markers.clearLayers();
      const bounds = L.latLngBounds([]);
      const sourceLatLng = L.latLng(state.source.latitude, state.source.longitude);
      bounds.extend(sourceLatLng);

      L.marker(sourceLatLng, {
        icon: createSourceMarker(state.source.label),
        keyboard: true,
        title: state.source.label,
      })
        .bindPopup(escapeHtml(state.source.label))
        .addTo(markers);

      state.results.forEach((poi) => {
        const category = categoryLookup.get(poi.categoryId);
        const popupLabel = poi.name || (category ? t(category.labelKey) : poi.categoryId);
        const marker = L.circleMarker([poi.latitude, poi.longitude], {
          radius: 8,
          color: '#2563eb',
          fillColor: '#93c5fd',
          fillOpacity: 0.9,
          weight: 3,
        }).bindPopup(
          `<strong>${escapeHtml(popupLabel)}</strong><br />${escapeHtml(formatDistance(poi.distanceKm, locale))}`,
        );

        marker.addTo(markers);
        bounds.extend([poi.latitude, poi.longitude]);
      });

      map.fitBounds(bounds.pad(0.18), { maxZoom: 16 });
    }
  };

  const loadResults = async () => {
    if (state.source.latitude === undefined || state.source.longitude === undefined) {
      renderEmptyState();
      return;
    }

    currentAbortController?.abort();
    currentAbortController = new AbortController();
    setStatus(t('poi.loading'));

    try {
      const response = await searchNearbyPois(
        {
          latitude: state.source.latitude,
          longitude: state.source.longitude,
          radiusMeters: state.radiusMeters,
          categoryIds: state.categoryIds,
        },
        { signal: currentAbortController.signal },
      );

      state.results = response.results;
      state.truncated = response.truncated;
      renderResults();
    } catch (error) {
      if (error instanceof NearbyPoiError && error.code === 'timeout' && currentAbortController.signal.aborted) {
        return;
      }

      state.results = [];
      state.truncated = false;
      markers?.clearLayers();
      setCount(0, 'warning');
      setStatus(getErrorMessage(error, t), 'danger');

      if (list) {
        list.innerHTML = `
          <article class="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-5 py-8 text-center text-sm text-[var(--color-text)]">
            ${escapeHtml(getErrorMessage(error, t))}
          </article>
        `;
      }
    }
  };

  const debouncedLoadResults = debounce(loadResults, 250);

  categoryInputs.forEach((input) => {
    input.addEventListener('change', () => {
      state.categoryIds = categoryInputs
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value as NearbyPoiCategoryId);
      void debouncedLoadResults();
    });
  });

  radiusSelect?.addEventListener('change', () => {
    state.radiusMeters = Number(radiusSelect.value);
    void debouncedLoadResults();
  });

  list?.addEventListener('click', (event) => {
    const focusButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-nearby-poi-focus]');

    if (!focusButton || !map) {
      return;
    }

    const poi = state.results.find((entry) => entry.id === focusButton.dataset.nearbyPoiFocus);

    if (!poi) {
      return;
    }

    map.setView([poi.latitude, poi.longitude], Math.max(map.getZoom(), 16));
    markers?.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        const latLng = layer.getLatLng();

        if (latLng.lat === poi.latitude && latLng.lng === poi.longitude) {
          layer.openPopup();
        }
      }
    });
  });

  return {
    setSource(nextSource: ExplorerSourceContext) {
      state.source = nextSource;

      if (nextSource.latitude === undefined || nextSource.longitude === undefined) {
        renderEmptyState();
        return;
      }

      ensureMap();
      void loadResults();
    },
  };
}
