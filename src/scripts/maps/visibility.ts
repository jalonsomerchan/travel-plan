import L from 'leaflet';
import type { MapTranslate } from './layers';

export type MapVisibilityKey =
  | 'currentLocation'
  | 'accommodation'
  | 'proposedPlans'
  | 'plans'
  | 'tripPois';
export type MapVisibilityState = Record<MapVisibilityKey, boolean>;

type StoredVisibilityState = Partial<Record<MapVisibilityKey | 'tripPois', unknown>> & {
  plans?: unknown;
};

const storageKey = 'travel-plan.map.visibility';
const defaultVisibility: MapVisibilityState = {
  currentLocation: true,
  accommodation: true,
  proposedPlans: true,
  plans: true,
  tripPois: true,
};

const visibilityOptions: { key: MapVisibilityKey; labelKey: string }[] = [
  { key: 'currentLocation', labelKey: 'map.visibility.currentLocation' },
  { key: 'accommodation', labelKey: 'map.visibility.accommodation' },
  { key: 'proposedPlans', labelKey: 'map.visibility.proposedPlans' },
  { key: 'plans', labelKey: 'map.visibility.plans' },
  { key: 'tripPois', labelKey: 'map.visibility.tripPois' },
];

function isStoredBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
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

function normalizeMapVisibilityState(parsed: StoredVisibilityState | null | undefined): MapVisibilityState {
  const legacyPlans = isStoredBoolean(parsed?.plans) ? parsed.plans : undefined;

  return {
    currentLocation: isStoredBoolean(parsed?.currentLocation)
      ? parsed.currentLocation
      : defaultVisibility.currentLocation,
    accommodation: isStoredBoolean(parsed?.accommodation)
      ? parsed.accommodation
      : defaultVisibility.accommodation,
    proposedPlans: isStoredBoolean(parsed?.proposedPlans)
      ? parsed.proposedPlans
      : legacyPlans ?? defaultVisibility.proposedPlans,
    plans: isStoredBoolean(parsed?.plans)
      ? parsed.plans
      : legacyPlans ?? defaultVisibility.plans,
    tripPois: isStoredBoolean(parsed?.tripPois)
      ? parsed.tripPois
      : defaultVisibility.tripPois,
  };
}

export function getMapVisibilityState(): MapVisibilityState {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? (JSON.parse(stored) as StoredVisibilityState) : undefined;
    return normalizeMapVisibilityState(parsed);
  } catch {
    return { ...defaultVisibility };
  }
}

function saveMapVisibilityState(state: MapVisibilityState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
}

export function syncCurrentLocationVisibility(visible: boolean) {
  document.querySelectorAll<HTMLElement>('.map-user-location-marker').forEach((marker) => {
    marker.style.display = visible ? '' : 'none';
  });
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
    const panelId = `map-visibility-panel-${Math.random().toString(36).slice(2, 10)}`;
    trigger.type = 'button';
    trigger.className = 'map-icon-button';
    trigger.title = t('map.visibility.label');
    trigger.setAttribute('aria-label', t('map.visibility.toggleLabel'));
    trigger.setAttribute('aria-controls', panelId);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M8 5.2v3.6M15 10.2v3.6M11 15.2v3.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'map-tool-card map-poi-panel map-poi-panel-portal';
    panel.hidden = true;
    panel.tabIndex = -1;

    const title = document.createElement('p');
    title.className = 'map-tool-title';
    title.textContent = t('map.visibility.label');

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'map-poi-options';
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = t('map.visibility.label');
    fieldset.append(legend);

    const inputs: HTMLInputElement[] = [];

    visibilityOptions.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'map-poi-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state[option.key];
      input.addEventListener('change', () => syncState({ ...state, [option.key]: input.checked }));
      const text = document.createElement('span');
      text.textContent = t(option.labelKey);
      label.append(input, text);
      fieldset.append(label);
      inputs.push(input);
    });

    const setPanelState = (open: boolean) => {
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));

      if (open) {
        positionPortalPanel(panel, trigger);
        requestAnimationFrame(() => {
          inputs[0]?.focus();
        });
      } else if (document.activeElement && panel.contains(document.activeElement)) {
        trigger.focus();
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

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && panel.hidden) {
        event.preventDefault();
        setPanelState(true);
      }
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPanelState(false);
      }
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

    panel.append(title, fieldset);
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
  onChange(state);
}
