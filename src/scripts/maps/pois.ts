import L from 'leaflet';
import { mapPoiCategories, mapPoiLimit } from '../../config/map-layers';
import { escapeHtml } from '../../lib/app/dom';
import type { MapTranslate } from './layers';

interface OverpassElement {
  id: number;
  type?: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: {
    name?: string;
    amenity?: string;
    tourism?: string;
    railway?: string;
  };
}

function buildFilterClause(filter: { key: string; value: string; useRegex?: boolean }) {
  if (filter.useRegex) {
    return `["${filter.key}"~"${filter.value}"]`;
  }

  return `["${filter.key}"="${filter.value}"]`;
}

function buildOverpassQuery(categoryIds: string[], bounds: L.LatLngBounds) {
  const bbox = [
    bounds.getSouth().toFixed(6),
    bounds.getWest().toFixed(6),
    bounds.getNorth().toFixed(6),
    bounds.getEast().toFixed(6),
  ].join(',');

  const filters = mapPoiCategories
    .filter((category) => categoryIds.includes(category.id))
    .flatMap((category) => category.overpassFilters)
    .flatMap((filter) =>
      ['node', 'way', 'relation'].map(
        (type) => `${type}${buildFilterClause(filter)}(${bbox});`,
      ),
    )
    .join('\n');

  return `[out:json][timeout:8];\n(\n${filters}\n);\nout center tags ${mapPoiLimit};`;
}

function getPoiLabel(element: OverpassElement, t: MapTranslate) {
  if (element.tags?.name) {
    return element.tags.name;
  }

  if (element.tags?.tourism === 'museum') {
    return t('map.poi.museum');
  }

  if (element.tags?.tourism === 'viewpoint') {
    return t('map.poi.viewpoint');
  }

  if (element.tags?.railway || element.tags?.amenity === 'bus_station') {
    return t('map.poi.transport');
  }

  return t('map.poi.food');
}

function getPoiCoordinates(element: OverpassElement) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return [element.lat, element.lon] as const;
  }

  if (typeof element.center?.lat === 'number' && typeof element.center?.lon === 'number') {
    return [element.center.lat, element.center.lon] as const;
  }

  return null;
}

function positionPortalPanel(panel: HTMLElement, trigger: HTMLElement) {
  const triggerRect = trigger.getBoundingClientRect();
  const margin = 12;
  const panelWidth = Math.min(304, window.innerWidth - margin * 2);
  const panelHeight = panel.getBoundingClientRect().height;
  const left = Math.min(
    Math.max(margin, triggerRect.right - panelWidth),
    window.innerWidth - panelWidth - margin,
  );
  const preferredTop = triggerRect.bottom + margin;
  const fallbackTop = triggerRect.top - panelHeight - margin;
  const top = preferredTop + panelHeight + margin <= window.innerHeight
    ? preferredTop
    : Math.max(margin, fallbackTop);

  panel.style.position = 'fixed';
  panel.style.right = 'auto';
  panel.style.width = `${panelWidth}px`;
  panel.style.zIndex = '10000';
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

export function addPoiControl(map: L.Map, t: MapTranslate) {
  const markers = L.layerGroup().addTo(map);
  const control = new L.Control({ position: 'topright' });
  const selectedCategories = new Set<string>();
  let abortController: AbortController | null = null;
  let portalPanel: HTMLElement | null = null;

  const loadPois = async (status: HTMLElement) => {
    markers.clearLayers();

    if (selectedCategories.size === 0) {
      status.textContent = '';
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    status.textContent = t('map.poi.loading');

    try {
      const query = buildOverpassQuery([...selectedCategories], map.getBounds());
      const response = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        { signal: abortController.signal },
      );

      if (!response.ok) {
        throw new Error('POI request failed');
      }

      const data = (await response.json()) as { elements?: OverpassElement[] };
      const pois = (data.elements ?? [])
        .filter((element) => Boolean(getPoiCoordinates(element)))
        .slice(0, mapPoiLimit);

      pois.forEach((element) => {
        const label = getPoiLabel(element, t);
        const coordinates = getPoiCoordinates(element);

        if (!coordinates) {
          return;
        }

        L.circleMarker(coordinates, {
          radius: 7,
          color: '#f97316',
          fillColor: '#fed7aa',
          fillOpacity: 0.92,
          weight: 2,
        })
          .bindPopup(escapeHtml(label))
          .addTo(markers);
      });

      status.textContent = pois.length > 0 ? t('map.poi.limitHint') : t('map.poi.empty');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      status.textContent = t('map.poi.error');
    }
  };

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-poi-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'map-icon-button';
    trigger.title = t('map.poi.title');
    trigger.setAttribute('aria-label', t('map.poi.toggleLabel'));
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20.2 3.8 4.1 10.7c-1.3.6-1.2 2.5.2 2.9l5.5 1.5 1.5 5.5c.4 1.4 2.3 1.5 2.9.2l6.9-16.1c.3-.7-.3-1.3-.9-.9Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="m10 14 4-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;

    const panel = document.createElement('div');
    panel.className = 'map-tool-card map-poi-panel map-poi-panel-portal';
    panel.hidden = true;

    const title = document.createElement('p');
    title.className = 'map-tool-title';
    title.textContent = t('map.poi.title');

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'map-poi-options';

    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = t('map.poi.toggleLabel');
    fieldset.append(legend);

    const status = document.createElement('p');
    status.className = 'map-tool-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    mapPoiCategories.forEach((category) => {
      const label = document.createElement('label');
      label.className = 'map-poi-option';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = category.id;

      input.addEventListener('change', () => {
        if (input.checked) {
          selectedCategories.add(category.id);
        } else {
          selectedCategories.delete(category.id);
        }

        void loadPois(status);
      });

      const text = document.createElement('span');
      text.textContent = t(category.labelKey);

      label.append(input, text);
      fieldset.append(label);
    });

    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'map-tool-button map-tool-button-secondary';
    refreshButton.textContent = t('map.poi.refresh');
    refreshButton.addEventListener('click', () => {
      void loadPois(status);
    });

    const setPanelState = (open: boolean) => {
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));

      if (open) {
        positionPortalPanel(panel, trigger);
      }
    };

    const syncPanelPosition = () => {
      if (!panel.hidden) {
        positionPortalPanel(panel, trigger);
      }
    };

    trigger.addEventListener('click', () => {
      setPanelState(panel.hidden);
    });

    document.addEventListener('click', (event) => {
      const target = event.target as Node;

      if (!container.contains(target) && !panel.contains(target)) {
        setPanelState(false);
      }
    });
    window.addEventListener('resize', syncPanelPosition);
    window.addEventListener('scroll', syncPanelPosition, { passive: true });
    map.on('resize move zoom', syncPanelPosition);

    panel.append(title, fieldset, refreshButton, status);
    document.body.append(panel);
    portalPanel = panel;
    container.append(trigger);

    return container;
  };

  control.onRemove = () => {
    portalPanel?.remove();
    portalPanel = null;
  };

  control.addTo(map);
}
