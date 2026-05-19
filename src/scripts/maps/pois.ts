import L from 'leaflet';
import { mapPoiCategories, mapPoiLimit } from '../../config/map-layers';
import { escapeHtml } from '../../lib/app/dom';
import type { MapTranslate } from './layers';

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    name?: string;
    amenity?: string;
    tourism?: string;
    railway?: string;
  };
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
    .map((filter) => `${filter}(${bbox});`)
    .join('\n');

  return `[out:json][timeout:8];\n(\n${filters}\n);\nout tags ${mapPoiLimit};`;
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

export function addPoiControl(map: L.Map, t: MapTranslate) {
  const markers = L.layerGroup().addTo(map);
  const control = new L.Control({ position: 'topright' });
  const selectedCategories = new Set<string>();
  let abortController: AbortController | null = null;

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
        .filter((element) => Number.isFinite(element.lat) && Number.isFinite(element.lon))
        .slice(0, mapPoiLimit);

      pois.forEach((element) => {
        const label = getPoiLabel(element, t);

        L.circleMarker([element.lat as number, element.lon as number], {
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
    const container = L.DomUtil.create('div', 'map-tool-card map-poi-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

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

    container.append(title, fieldset, refreshButton, status);

    return container;
  };

  control.addTo(map);
}
