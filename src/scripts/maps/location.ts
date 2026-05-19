import L from 'leaflet';
import { escapeHtml } from '../../lib/app/dom';
import type { MapTranslate } from './layers';

export function addCurrentLocationControl(map: L.Map, t: MapTranslate) {
  let marker: L.Marker | null = null;
  const control = new L.Control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-icon-control map-location-control');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-icon-button';
    button.title = t('map.location.button');
    button.setAttribute('aria-label', t('map.location.button'));
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M6.7 6.7l2.2 2.2M15.1 15.1l2.2 2.2M17.3 6.7l-2.2 2.2M8.9 15.1l-2.2 2.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.9"/>
      </svg>
    `;

    const status = document.createElement('p');
    status.className = 'map-tool-status sr-only';
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
