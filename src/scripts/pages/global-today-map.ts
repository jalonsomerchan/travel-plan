import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance } from '../../lib/app/format';
import type { TodayLocationState, TodayPlanItem } from '../../lib/app/global-today';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { createPlanMarkerIcon } from '../maps/trip-markers';
import { getCategoryLabel, getPageTranslator, getPlanStatusLabel } from './shared';

interface GlobalTodayMapPayload {
  isOpen: boolean;
  items: TodayPlanItem[];
  locationState: TodayLocationState;
}

function getBoundsSignature(items: TodayPlanItem[], locationState: TodayLocationState) {
  return [
    ...items
      .filter((item) => hasPlanLocation(item.plan))
      .map((item) => `${item.plan.id}:${item.plan.locationLat}:${item.plan.locationLng}:${item.distanceKm ?? '-'}`),
    locationState.location
      ? `user:${locationState.location.latitude}:${locationState.location.longitude}:${locationState.location.accuracyMeters ?? '-'}`
      : 'user:none',
  ].join('|');
}

export function createGlobalTodayMapController(locale: Locale) {
  const t = getPageTranslator(locale);
  const canvas = document.querySelector<HTMLElement>('[data-today-map-canvas]');
  const status = document.querySelector<HTMLElement>('[data-today-map-status]');
  const summary = document.querySelector<HTMLElement>('[data-today-map-summary]');
  let map: L.Map | null = null;
  let tileLayer: L.TileLayer | null = null;
  let markerLayer: L.LayerGroup | null = null;
  let hasUserInteracted = false;
  let lastBoundsSignature = '';

  function setStatus(message: string) {
    if (status) {
      status.textContent = message;
    }
  }

  function setSummary(message: string) {
    if (summary) {
      summary.textContent = message;
      summary.hidden = !message;
    }
  }

  function setCanvasVisible(isVisible: boolean) {
    if (!canvas) {
      return;
    }

    canvas.hidden = !isVisible;
    canvas.classList.toggle('hidden', !isVisible);
  }

  function ensureMap() {
    if (!canvas) {
      return null;
    }

    if (map) {
      return map;
    }

    setCanvasVisible(true);
    map = L.map(canvas, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([40.4168, -3.7038], 5);

    map.on('dragstart zoomstart', () => {
      hasUserInteracted = true;
    });

    tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    return map;
  }

  function fitMapBounds(activeMap: L.Map, bounds: L.LatLngBounds, signature: string) {
    activeMap.invalidateSize();

    if (hasUserInteracted && lastBoundsSignature) {
      lastBoundsSignature = signature;
      return;
    }

    lastBoundsSignature = signature;

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

  function getPlanPopupHtml(item: TodayPlanItem) {
    const categoryLabel = getCategoryLabel(locale, item.plan.category);
    const statusLabel = getPlanStatusLabel(locale, item.plan.status);
    const locationLabel = getPlanLocationLabel(item.plan) || t('today.card.noLocation');
    const distanceLabel = typeof item.distanceKm === 'number' ? formatDistance(item.distanceKm, locale) : '';
    const planUrl = getAppUrl(locale, 'plan', { trip: item.trip.id, plan: item.plan.id });

    return `
      <strong>${escapeHtml(item.plan.name)}</strong>
      <dl class="mt-2 grid gap-1 text-sm">
        <div><dt class="font-bold">${escapeHtml(t('today.map.popup.trip'))}</dt><dd>${escapeHtml(item.trip.name)}</dd></div>
        <div><dt class="font-bold">${escapeHtml(t('today.map.popup.status'))}</dt><dd>${escapeHtml(statusLabel)}</dd></div>
        <div><dt class="font-bold">${escapeHtml(t('today.map.popup.category'))}</dt><dd>${escapeHtml(categoryLabel)}</dd></div>
        <div><dt class="font-bold">${escapeHtml(t('today.map.popup.location'))}</dt><dd>${escapeHtml(locationLabel)}</dd></div>
        <div><dt class="font-bold">${escapeHtml(t('today.map.popup.distance'))}</dt><dd>${escapeHtml(distanceLabel || t('today.card.distanceUnavailable'))}</dd></div>
      </dl>
      <a class="map-popup-link" href="${escapeHtml(planUrl)}">${escapeHtml(t('today.map.popup.openPlan'))}</a>
    `;
  }

  function renderPlanMarkers(items: TodayPlanItem[], bounds: L.LatLngBounds) {
    if (!markerLayer) {
      return 0;
    }

    const locatedItems = items.filter((item) => hasPlanLocation(item.plan));

    locatedItems.forEach((item) => {
      const latLng = L.latLng(item.plan.locationLat, item.plan.locationLng);
      const statusLabel = getPlanStatusLabel(locale, item.plan.status);
      const title = `${item.plan.name} · ${item.trip.name} · ${statusLabel}`;
      bounds.extend(latLng);

      L.marker(latLng, {
        icon: createPlanMarkerIcon(item.plan, locale, {
          emphasized: typeof item.distanceKm === 'number',
          muted: item.plan.status === 'proposed',
        }),
        keyboard: true,
        title,
      })
        .bindPopup(getPlanPopupHtml(item))
        .addTo(markerLayer);
    });

    return locatedItems.length;
  }

  function renderMapSummary(payload: GlobalTodayMapPayload, locatedCount: number) {
    const withoutLocationCount = Math.max(payload.items.length - locatedCount, 0);
    const locationLabel = payload.locationState.location
      ? t('today.map.summary.withUserLocation')
      : t('today.map.summary.withoutUserLocation');

    setSummary(
      t('today.map.summary')
        .replace('{located}', String(locatedCount))
        .replace('{withoutLocation}', String(withoutLocationCount))
        .replace('{location}', locationLabel),
    );
  }

  function sync(payload: GlobalTodayMapPayload) {
    if (!canvas || !status) {
      return;
    }

    if (!payload.isOpen) {
      setCanvasVisible(false);
      setStatus(t('today.map.idle'));
      setSummary('');
      return;
    }

    const activeMap = ensureMap();

    if (!activeMap || !markerLayer || !tileLayer) {
      setCanvasVisible(false);
      setStatus(t('today.map.unavailable'));
      setSummary('');
      return;
    }

    markerLayer.clearLayers();
    const bounds = L.latLngBounds([]);
    const locatedCount = renderPlanMarkers(payload.items, bounds);
    renderUserLocation(payload.locationState, bounds);
    renderMapSummary(payload, locatedCount);

    if (locatedCount === 0 && !payload.locationState.location) {
      setCanvasVisible(false);
      setStatus(t('today.map.empty'));
      return;
    }

    setCanvasVisible(true);

    if (locatedCount === 0) {
      setStatus(t('today.map.onlyUserLocation'));
    } else if (!payload.locationState.location) {
      setStatus(t('today.map.withoutUserLocation').replace('{count}', String(locatedCount)));
    } else {
      setStatus(t('today.map.ready').replace('{count}', String(locatedCount)));
    }

    const signature = getBoundsSignature(payload.items, payload.locationState);
    requestAnimationFrame(() => fitMapBounds(activeMap, bounds, signature));
  }

  return { sync };
}
