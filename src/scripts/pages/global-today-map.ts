import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import type { TodayLocationState, TodayPlanItem } from '../../lib/app/global-today';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { createPlanMarkerIcon } from '../maps/trip-markers';
import { getCategoryLabel, getPageTranslator } from './shared';

interface GlobalTodayMapPayload {
  isOpen: boolean;
  items: TodayPlanItem[];
  locationState: TodayLocationState;
}

export function createGlobalTodayMapController(locale: Locale) {
  const t = getPageTranslator(locale);
  const canvas = document.querySelector<HTMLElement>('[data-today-map-canvas]');
  const status = document.querySelector<HTMLElement>('[data-today-map-status]');
  let map: L.Map | null = null;
  let tileLayer: L.TileLayer | null = null;
  let markerLayer: L.LayerGroup | null = null;

  function setStatus(message: string) {
    if (status) {
      status.textContent = message;
    }
  }

  function ensureMap() {
    if (!canvas) {
      return null;
    }

    if (map) {
      return map;
    }

    canvas.hidden = false;
    map = L.map(canvas, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([40.4168, -3.7038], 5);

    tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    return map;
  }

  function fitMapBounds(activeMap: L.Map, bounds: L.LatLngBounds) {
    activeMap.invalidateSize();

    if (!bounds.isValid()) {
      activeMap.setView([40.4168, -3.7038], 5);
      return;
    }

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    if (northEast.equals(southWest)) {
      activeMap.setView(bounds.getCenter(), 14);
      return;
    }

    activeMap.fitBounds(bounds.pad(0.2), {
      maxZoom: 14,
      padding: [24, 24],
    });
  }

  function renderUserLocation(locationState: TodayLocationState, bounds: L.LatLngBounds) {
    if (!markerLayer || !locationState.location) {
      return;
    }

    const userLatLng = L.latLng(locationState.location.latitude, locationState.location.longitude);
    bounds.extend(userLatLng);

    L.circleMarker(userLatLng, {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2563eb',
      fillOpacity: 1,
    })
      .bindPopup(escapeHtml(t('today.map.userLocation')))
      .addTo(markerLayer);

    if (typeof locationState.location.accuracyMeters === 'number') {
      L.circle(userLatLng, {
        radius: locationState.location.accuracyMeters,
        color: '#2563eb',
        weight: 1,
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
      }).addTo(markerLayer);
    }
  }

  function renderPlanMarkers(items: TodayPlanItem[], bounds: L.LatLngBounds) {
    if (!markerLayer) {
      return 0;
    }

    const locatedItems = items.filter((item) => hasPlanLocation(item.plan));

    locatedItems.forEach((item) => {
      const latLng = L.latLng(item.plan.locationLat, item.plan.locationLng);
      const categoryLabel = getCategoryLabel(locale, item.plan.category);
      bounds.extend(latLng);

      L.marker(latLng, {
        icon: createPlanMarkerIcon(item.plan, locale, { emphasized: typeof item.distanceKm === 'number' }),
        keyboard: true,
        title: item.plan.name,
      })
        .bindPopup(
          [
            `<strong>${escapeHtml(item.plan.name)}</strong>`,
            escapeHtml(item.trip.name),
            escapeHtml(categoryLabel),
            escapeHtml(getPlanLocationLabel(item.plan) || t('today.card.noLocation')),
          ].join('<br />'),
        )
        .addTo(markerLayer);
    });

    return locatedItems.length;
  }

  function sync(payload: GlobalTodayMapPayload) {
    if (!canvas || !status) {
      return;
    }

    if (!payload.isOpen) {
      canvas.hidden = true;
      setStatus(t('today.map.idle'));
      return;
    }

    const activeMap = ensureMap();

    if (!activeMap || !markerLayer || !tileLayer) {
      canvas.hidden = true;
      setStatus(t('today.map.unavailable'));
      return;
    }

    markerLayer.clearLayers();
    const bounds = L.latLngBounds([]);
    const locatedCount = renderPlanMarkers(payload.items, bounds);
    renderUserLocation(payload.locationState, bounds);

    if (locatedCount === 0 && !payload.locationState.location) {
      canvas.hidden = true;
      setStatus(t('today.map.empty'));
      return;
    }

    canvas.hidden = false;

    if (locatedCount === 0) {
      setStatus(t('today.map.onlyUserLocation'));
    } else if (!payload.locationState.location) {
      setStatus(t('today.map.withoutUserLocation').replace('{count}', String(locatedCount)));
    } else {
      setStatus(t('today.map.ready').replace('{count}', String(locatedCount)));
    }

    requestAnimationFrame(() => fitMapBounds(activeMap, bounds));
  }

  return { sync };
}
