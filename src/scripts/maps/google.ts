import L from 'leaflet';
import { getGoogleMapsDisplayMapUrl } from '../../lib/app/location-links';
import type { MapTranslate } from './layers';

function getMapCenterUrl(map: L.Map) {
  const center = map.getCenter();
  return getGoogleMapsDisplayMapUrl(center.lat, center.lng, map.getZoom());
}

export function addOpenInGoogleMapsControl(map: L.Map, t: MapTranslate) {
  const control = new L.Control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-icon-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const link = document.createElement('a');
    link.className = 'map-icon-button';
    link.href = getMapCenterUrl(map);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = t('map.google.open');
    link.setAttribute('aria-label', t('map.google.open'));
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M14 4h6v6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10 14 20 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;

    const syncHref = () => {
      link.href = getMapCenterUrl(map);
    };

    map.on('moveend zoomend', syncHref);
    syncHref();
    container.append(link);

    return container;
  };

  control.addTo(map);
}
