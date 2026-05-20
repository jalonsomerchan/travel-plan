import L from 'leaflet';
import {
  defaultMapLayerId,
  mapLayers,
  type MapLayerConfig,
} from '../../config/map-layers';

export type MapTranslate = (key: string) => string;

const mapLayerStorageKey = 'travelplan.map.layer';

function createTileLayer(layer: MapLayerConfig) {
  const options: L.TileLayerOptions = {
    attribution: layer.attribution,
    maxZoom: layer.maxZoom,
  };

  if (layer.subdomains) {
    options.subdomains = layer.subdomains;
  }

  return L.tileLayer(layer.urlTemplate, options);
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

function positionPortalPanel(panel: HTMLElement, trigger: HTMLElement) {
  const triggerRect = trigger.getBoundingClientRect();
  const margin = 12;
  const panelWidth = Math.min(320, window.innerWidth - margin * 2);
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

export function addMapLayerSelector(map: L.Map, t: MapTranslate) {
  const layers = new Map(mapLayers.map((layer) => [layer.id, createTileLayer(layer)]));
  let activeLayerId = getStoredLayerId() ?? defaultMapLayerId;
  let activeLayer = layers.get(activeLayerId) ?? layers.get(defaultMapLayerId);
  let portalPanel: HTMLElement | null = null;

  if (!activeLayer) {
    return;
  }

  activeLayer.addTo(map);

  const control = new L.Control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-layer-selector');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'map-icon-button';
    trigger.title = t('map.layers.label');
    trigger.setAttribute('aria-label', t('map.layers.label'));
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M3 12.5 12 17l9-4.5M3 17l9 4 9-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const panel = document.createElement('div');
    panel.className = 'map-tool-card map-layer-panel map-layer-panel-portal';
    panel.hidden = true;

    const title = document.createElement('p');
    title.className = 'map-tool-title';
    title.textContent = t('map.layers.label');

    const current = document.createElement('p');
    current.className = 'map-layer-current';

    const options = document.createElement('div');
    options.className = 'map-layer-options';

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

    const updateCurrentLabel = () => {
      const activeConfig = mapLayers.find((layer) => layer.id === activeLayerId);
      current.textContent = activeConfig ? t(activeConfig.labelKey) : '';
    };

    mapLayers.forEach((layer) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'map-layer-option';
      option.dataset.active = String(layer.id === activeLayerId);
      option.innerHTML = `
        <span class="map-layer-swatch map-layer-swatch--${layer.id}" aria-hidden="true"></span>
        <span>${t(layer.labelKey)}</span>
      `;

      option.addEventListener('click', () => {
        const nextLayerId = layer.id;
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
        updateCurrentLabel();
        options.querySelectorAll<HTMLElement>('.map-layer-option').forEach((element) => {
          element.dataset.active = String(element === option);
        });
        setPanelState(false);
      });

      options.append(option);
    });

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

    updateCurrentLabel();
    panel.append(title, current, options);
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
