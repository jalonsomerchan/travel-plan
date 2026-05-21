import L from 'leaflet';
import { escapeHtml } from '../../lib/app/dom';
import type { MapTranslate } from './layers';
import { getMapVisibilityState } from './visibility';

interface CurrentLocationOptions {
  centerOnLocation?: boolean;
  locateOnLoad?: boolean;
}

function syncMarkerVisibility(marker: L.Marker) {
  const element = marker.getElement();

  if (element) {
    element.style.display = getMapVisibilityState().currentLocation ? '' : 'none';
  }
}

export function addUserLocationMarker(
  map: L.Map,
  t: MapTranslate,
  options: CurrentLocationOptions = {},
) {
  let marker: L.Marker | null = null;
  const centerOnLocation = options.centerOnLocation ?? true;

  const locate = (status?: HTMLElement, button?: HTMLButtonElement, forceCenter = false) => {
    if (!('geolocation' in navigator)) {
      if (status) status.textContent = t('map.location.unsupported');
      return;
    }

    if (button) button.disabled = true;
    if (status) status.textContent = t('map.location.loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (button) button.disabled = false;

        const { latitude, longitude } = position.coords;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          if (status) status.textContent = t('map.location.unavailable');
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
        syncMarkerVisibility(marker);

        if (centerOnLocation || forceCenter) {
          map.setView(latLng, Math.max(map.getZoom(), 15));
        }

        if (status) status.textContent = t('map.location.marker');
      },
      (error) => {
        if (button) button.disabled = false;

        if (!status) {
          return;
        }

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
  };

  if (options.locateOnLoad) {
    locate();
  }

  return { locate };
}

export function addCurrentLocationControl(
  map: L.Map,
  t: MapTranslate,
  options: CurrentLocationOptions = {},
) {
  const control = new L.Control({ position: 'topright' });
  const userLocation = addUserLocationMarker(map, t, options);

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
        <path d="M20.2 3.8 4.1 10.7c-1.3.6-1.2 2.5.2 2.9l5.5 1.5 1.5 5.5c.4 1.4 2.3 1.5 2.9.2l6.9-16.1c.3-.7-.3-1.3-.9-.9Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="m10 14 4-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;

    const status = document.createElement('p');
    status.className = 'map-tool-status sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    button.addEventListener('click', () => userLocation.locate(status, button, true));

    container.append(button, status);

    return container;
  };

  control.addTo(map);
}
