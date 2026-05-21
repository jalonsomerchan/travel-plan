import L from 'leaflet';
import type { MapTranslate } from './layers';

export function addMobileMapControlsToggle(map: L.Map, t: MapTranslate) {
  const control = new L.Control({ position: 'topright' });
  const mapContainer = map.getContainer();

  const setExpanded = (button: HTMLButtonElement, expanded: boolean) => {
    mapContainer.classList.toggle('map-mobile-tools-open', expanded);
    button.setAttribute('aria-expanded', String(expanded));
  };

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-icon-control map-mobile-tools-toggle');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-icon-button';
    button.title = t('map.mobileControls');
    button.setAttribute('aria-label', t('map.mobileControls'));
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;

    button.addEventListener('click', () => {
      setExpanded(button, button.getAttribute('aria-expanded') !== 'true');
    });

    map.on('click', () => setExpanded(button, false));

    container.append(button);
    return container;
  };

  control.addTo(map);
}
