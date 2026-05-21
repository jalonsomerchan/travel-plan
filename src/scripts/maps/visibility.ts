import L from 'leaflet';
import type { MapTranslate } from './layers';

export type MapVisibilityKey = 'currentLocation' | 'accommodation' | 'plans' | 'tripPois';

export type MapVisibilityState = Record<MapVisibilityKey, boolean>;

const storageKey = 'travel-plan.map.visibility';

const defaultVisibility: MapVisibilityState = {
  currentLocation: true,
  accommodation: true,
  plans: true,
  tripPois: true,
};

const visibilityOptions: { key: MapVisibilityKey; labelKey: string }[] = [
  { key: 'currentLocation', labelKey: 'map.visibility.currentLocation' },
  { key: 'accommodation', labelKey: 'map.visibility.accommodation' },
  { key: 'plans', labelKey: 'map.visibility.plans' },
  { key: 'tripPois', labelKey: 'map.visibility.tripPois' },
];

export function getMapVisibilityState(): MapVisibilityState {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : {};

    return {
      currentLocation: typeof parsed.currentLocation === 'boolean' ? parsed.currentLocation : true,
      accommodation: typeof parsed.accommodation === 'boolean' ? parsed.accommodation : true,
      plans: typeof parsed.plans === 'boolean' ? parsed.plans : true,
      tripPois: typeof parsed.tripPois === 'boolean' ? parsed.tripPois : true,
    };
  } catch {
    return { ...defaultVisibility };
  }
}

function saveMapVisibilityState(state: MapVisibilityState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Browsers can block localStorage in private or restricted contexts.
  }
}

export function addMapVisibilityControl(
  map: L.Map,
  t: MapTranslate,
  onChange: (state: MapVisibilityState) => void,
) {
  const control = new L.Control({ position: 'topright' });
  let state = getMapVisibilityState();
  let portalPanel: HTMLElement | null = null;

  const syncState = (nextState: MapVisibilityState) => {
    state = nextState;
    saveMapVisibilityState(state);
    onChange(state);
  };

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-poi-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'map-icon-button';
    trigger.title = t('map.visibility.title');
    trigger.setAttribute('aria-label', t('map.visibility.toggleLabel'));
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        <path d="M8 5.2v3.6M15 10.2v3.6M11 15.2v3.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;

    const panel = document.createElement('div');
    panel.className = 'map-tool-card map-poi-panel map-poi-panel-portal';
    panel.hidden = true;

    const title = document.createElement('p');
    title.className = 'map-tool-title';
    title.textContent = t('map.visibility.title');

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'map-poi-options';

    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = t('map.visibility.toggleLabel');
    fieldset.append(legend);

    visibilityOptions.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'map-poi-option';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state[option.key];

      input.addEventListener('change', () => {
        syncState({ ...state, [option.key]: input.checked });
      });

      const text = document.createElement('span');
      text.textContent = t(option.labelKey);

      label.append(input, text);
      fieldset.append(label);
    });

    const setPanelState = (open: boolean) => {
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
    };

    trigger.addEventListener('click', () => setPanelState(panel.hidden));

    document.addEventListener('click', (event) => {
      const target = event.target as Node;

      if (!container.contains(target) && !panel.contains(target)) {
        setPanelState(false);
      }
    });

    panel.append(title, fieldset);
    container.append(trigger, panel);
    portalPanel = panel;

    return container;
  };

  control.onRemove = () => {
    portalPanel?.remove();
    portalPanel = null;
  };

  control.addTo(map);
  onChange(state);
}
