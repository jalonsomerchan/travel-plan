import L from 'leaflet';
import {
  defaultMapLayerId,
  mapLayers,
  type MapLayerConfig,
} from '../../config/map-layers';

export type MapTranslate = (key: string) => string;

const mapLayerStorageKey = 'travelplan.map.layer';

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

export function addMapLayerSelector(map: L.Map, t: MapTranslate) {
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
