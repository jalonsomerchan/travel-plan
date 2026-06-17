import L from 'leaflet';
import { escapeHtml } from '../../lib/app/dom';
import type { MapTranslate } from './layers';
import { getMapVisibilityState, syncCurrentLocationVisibility } from './visibility';

export interface CurrentLocationCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface CurrentLocationOptions {
  centerOnLocation?: boolean;
  locateOnLoad?: boolean;
  renderMarker?: boolean;
  onLocation?: (location: CurrentLocationCoordinates) => void;
}

function syncMarkerVisibility(marker: L.Marker) {
  const element = marker.getElement();

  if (element) {
    syncCurrentLocationVisibility(getMapVisibilityState().currentLocation);
  }
}

export function addUserLocationMarker(
  map: L.Map,
  t: MapTranslate,
  options: CurrentLocationOptions = {},
) {
  let marker: L.Marker | null = null;
  const centerOnLocation = options.centerOnLocation ?? true;
  const renderMarker = options.renderMarker ?? true;

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

        const { latitude, longitude, accuracy } = position.coords;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          if (status) status.textContent = t('map.location.unavailable');
          return;
        }

        const latLng = L.latLng(latitude, longitude);
        const nextLocation: CurrentLocationCoordinates = {
          latitude,
          longitude,
          accuracyMeters: Number.isFinite(accuracy) ? accuracy : undefined,
        };

        if (renderMarker) {
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
        }

        options.onLocation?.(nextLocation);

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
  const control = new L.Control({ position: 'topleft' });
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
        <path d="M12 21s6.5-5.8 6.5-11.1A6.5 6.5 0 0 0 5.5 9.9C5.5 15.2 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        <circle cx="12" cy="9.8" r="2.35" fill="none" stroke="currentColor" stroke-width="1.9"/>
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
