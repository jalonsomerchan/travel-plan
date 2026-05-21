import L from 'leaflet';
import type { MapTranslate } from './layers';

interface FocusControlState {
  visible: boolean;
}

interface PlanAccommodationFocusControl {
  setVisible(visible: boolean): void;
}

function fitPlanAndAccommodation(map: L.Map, points: [L.LatLngExpression, L.LatLngExpression]) {
  map.invalidateSize();
  map.fitBounds(L.latLngBounds(points).pad(0.24), {
    maxZoom: 15,
    padding: [48, 48],
  });
}

export function addPlanAccommodationFocusControl(
  map: L.Map,
  t: MapTranslate,
  onFocus: () => [L.LatLngExpression, L.LatLngExpression] | null,
): PlanAccommodationFocusControl {
  const control = new L.Control({ position: 'topright' });
  let container: HTMLElement | null = null;
  const state: FocusControlState = { visible: false };

  const syncVisibility = () => {
    if (container) {
      container.hidden = !state.visible;
    }
  };

  control.onAdd = () => {
    container = L.DomUtil.create('div', 'map-icon-control map-plan-focus-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-icon-button';
    button.title = t('map.planAccommodationFocus');
    button.setAttribute('aria-label', t('map.planAccommodationFocus'));
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 11.4 12 4l9 7.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V20h4.25v-5.5h4.5V20h4.25v-9.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    button.addEventListener('click', () => {
      const points = onFocus();

      if (!points) {
        return;
      }

      fitPlanAndAccommodation(map, points);
    });

    container.append(button);
    syncVisibility();
    return container;
  };

  control.addTo(map);

  return {
    setVisible(visible: boolean) {
      state.visible = visible;
      syncVisibility();
    },
  };
}
