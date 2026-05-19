import L from 'leaflet';
import {
  defaultMapLayerId,
  mapLayers,
  mapPoiCategories,
  mapPoiLimit,
  type MapLayerConfig,
} from '../../config/map-layers';
import { escapeHtml } from '../../lib/app/dom';

type Translate = (key: string) => string;

const mapLayerStorageKey = 'travelplan.map.layer';

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

function createTileLayer(layer: MapLayerConfig) {
  return L.tileLayer(layer.urlTemplate, {
    attribution: layer.attribution,
    maxZoom: layer.maxZoom,
    subdomains: layer.subdomains,
  });
}

function getStoredLayerId() {
  try {
    return window.localStorage.getItem(mapLayerStorageKey);
  } catch {
    return null;
  }
}

function setStoredLayerId(layerId: string) {
  try {
    window.localStorage.setItem(mapLayerStorageKey, layerId);
  } catch {
    // Storage can be disabled. The selected layer still works for the current map.
  }
}

export function addMapLayerSelector(map: L.Map, t: Translate) {
  const layers = new Map(mapLayers.map((layer) => [layer.id, createTileLayer(layer)]));
  let activeLayerId = getStoredLayerId() ?? defaultMapLayerId;
  let activeLayer = layers.get(activeLayerId) ?? layers.get(defaultMapLayerId);

  if (!activeLayer) {
    return;
  }

  activeLayer.addTo(map);

  const control = new L.Control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-tool-card map-layer-selector');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const label = document.createElement('label');
    label.className = 'map-tool-label';
    label.textContent = t('map.layers.label');

    const select = document.createElement('select');
    select.className = 'map-tool-select';
    select.setAttribute('aria-label', t('map.layers.label'));

    mapLayers.forEach((layer) => {
      const option = document.createElement('option');
      option.value = layer.id;
      option.textContent = t(layer.labelKey);
      option.selected = layer.id === activeLayerId;
      select.append(option);
    });

    select.addEventListener('change', () => {
      const nextLayerId = select.value;
      const nextLayer = layers.get(nextLayerId);

      if (!nextLayer || nextLayer === activeLayer) {
        return;
      }

      if (activeLayer) {
        map.removeLayer(activeLayer);
      }

      activeLayer = nextLayer;
      activeLayerId = nextLayerId;
      activeLayer.addTo(map);
      setStoredLayerId(nextLayerId);
    });

    label.append(select);
    container.append(label);

    return container;
  };

  control.addTo(map);
}

export function addCurrentLocationControl(map: L.Map, t: Translate) {
  let marker: L.Marker | null = null;
  const control = new L.Control({ position: 'topleft' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-tool-card map-location-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-tool-button';
    button.textContent = t('map.location.button');

    const status = document.createElement('p');
    status.className = 'map-tool-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    button.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        status.textContent = t('map.location.unsupported');
        return;
      }

      button.disabled = true;
      status.textContent = t('map.location.loading');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          button.disabled = false;

          const { latitude, longitude } = position.coords;

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            status.textContent = t('map.location.unavailable');
            return;
          }

          const latLng = L.latLng(latitude, longitude);

          if (marker) {
            marker.setLatLng(latLng);
          } else {
            marker = L.marker(latLng, {
              icon: L.divIcon({
                className: 'map-user-location-marker',
                html: '<span aria-hidden="true"></span>',
                iconAnchor: [10, 10],
                iconSize: [20, 20],
              }),
              keyboard: true,
              title: t('map.location.marker'),
            }).addTo(map);
          }

          marker.bindPopup(escapeHtml(t('map.location.marker')));
          map.setView(latLng, Math.max(map.getZoom(), 15));
          status.textContent = t('map.location.marker');
        },
        (error) => {
          button.disabled = false;

          if (error.code === error.PERMISSION_DENIED) {
            status.textContent = t('map.location.denied');
            return;
          }

          if (error.code === error.TIMEOUT) {
            status.textContent = t('map.location.timeout');
            return;
          }

          status.textContent = t('map.location.unavailable');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        },
      );
    });

    container.append(button, status);

    return container;
  };

  control.addTo(map);
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

  return `[out:json][timeout:8];\n(\n${filters}\n);\nout tags center ${mapPoiLimit};`;
}

function getPoiLabel(element: OverpassElement, t: Translate) {
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

export function addPoiControl(map: L.Map, t: Translate) {
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

export function addMapTools(map: L.Map, t: Translate) {
  addMapLayerSelector(map, t);
  addCurrentLocationControl(map, t);
  addPoiControl(map, t);
}
