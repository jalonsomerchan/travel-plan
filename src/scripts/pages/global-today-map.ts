import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import { escapeHtml } from '../../lib/app/dom';
import { formatDistance } from '../../lib/app/format';
import type {
  TodayLocationState,
  TodayPlanItem,
  TodayUserLocation,
} from '../../lib/app/global-today';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { addMapTools } from '../maps/leaflet-map-tools';
import { createPlanMarkerIcon } from '../maps/trip-markers';
import {
  addMapVisibilityControl,
  getMapVisibilityState,
  type MapVisibilityPreferences,
  syncCurrentLocationVisibility,
} from '../maps/visibility';
import { getCategoryLabel, getPageTranslator, getPlanStatusLabel } from './shared';

interface GlobalTodayMapPayload {
  isOpen: boolean;
  items: TodayPlanItem[];
  locationState: TodayLocationState;
}

interface GlobalTodayMapControllerOptions {
  onLocation?: (location: TodayUserLocation) => void;
}

function isVisiblePlanItem(item: TodayPlanItem, visibility: MapVisibilityPreferences) {
  if (!visibility.categories[item.plan.category]) {
    return false;
  }

  if (item.plan.status === 'proposed') {
    return visibility.proposedPlans;
  }

  return visibility.plans;
}

function getBoundsSignature(
  items: TodayPlanItem[],
  locationState: TodayLocationState,
  visibility: MapVisibilityPreferences,
) {
  return [
    `currentLocation:${visibility.currentLocation}`,
    `plans:${visibility.plans}`,
    `proposedPlans:${visibility.proposedPlans}`,
    ...Object.entries(visibility.categories).map(([category, visible]) => `${category}:${visible}`),
    ...items
      .filter((item) => hasPlanLocation(item.plan) && isVisiblePlanItem(item, visibility))
      .map((item) => `${item.plan.id}:${item.plan.locationLat}:${item.plan.locationLng}:${item.distanceKm ?? '-'}`),
    visibility.currentLocation && locationState.location
      ? `user:${locationState.location.latitude}:${locationState.location.longitude}:${locationState.location.accuracyMeters ?? '-'}`
      : 'user:none',
  ].join('|');
}

function syncLayerVisibility(map: L.Map, layer: L.LayerGroup | null, visible: boolean) {
  if (!layer) {
    return;
  }

  if (visible && !map.hasLayer(layer)) {
    layer.addTo(map);
  }

  if (!visible && map.hasLayer(layer)) {
    layer.removeFrom(map);
  }
}

export function createGlobalTodayMapController(
  locale: Locale,
  options: GlobalTodayMapControllerOptions = {},
) {
  const t = getPageTranslator(locale);
  const canvas = document.querySelector<HTMLElement>('[data-today-map-canvas]');
  const status = document.querySelector<HTMLElement>('[data-today-map-status]');
  const summary = document.querySelector<HTMLElement>('[data-today-map-summary]');
  let map: L.Map | null = null;
  let proposedPlanMarkers: L.LayerGroup | null = null;
  let planMarkers: L.LayerGroup | null = null;
  let currentLocationMarkers: L.LayerGroup | null = null;
  let visibility = getMapVisibilityState();
  let hasUserInteracted = false;
  let lastBoundsSignature = '';
  let lastPayload: GlobalTodayMapPayload | null = null;

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

  function applyVisibility() {
    if (!map) {
      return;
    }

    syncLayerVisibility(map, proposedPlanMarkers, visibility.proposedPlans);
    syncLayerVisibility(map, planMarkers, visibility.plans);
    syncLayerVisibility(map, currentLocationMarkers, visibility.currentLocation);
    syncCurrentLocationVisibility(visibility.currentLocation);
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

    proposedPlanMarkers = L.layerGroup().addTo(map);
    planMarkers = L.layerGroup().addTo(map);
    currentLocationMarkers = L.layerGroup().addTo(map);

    addMapTools(map, t, {
      currentLocation: {
        centerOnLocation: false,
        locateOnLoad: true,
        renderMarker: false,
        onLocation: options.onLocation,
      },
    });
    addMapVisibilityControl(map, t, (nextVisibility) => {
      visibility = nextVisibility;
      applyVisibility();

      if (lastPayload) {
        sync(lastPayload);
      }
    });
    applyVisibility();

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
    if (!currentLocationMarkers || !visibility.currentLocation || !locationState.location) {
      return false;
    }

    const userLatLng = L.latLng(locationState.location.latitude, locationState.location.longitude);
    bounds.extend(userLatLng);

    L.marker(userLatLng, {
      icon: L.divIcon({
        className: 'map-user-location-marker',
        html: '<span aria-hidden="true"></span>',
        iconAnchor: [10, 10],
        iconSize: [20, 20],
      }),
      keyboard: true,
      title: t('today.map.userLocation'),
    })
      .bindPopup(escapeHtml(t('today.map.userLocation')))
      .addTo(currentLocationMarkers);

    if (typeof locationState.location.accuracyMeters === 'number') {
      L.circle(userLatLng, {
        radius: locationState.location.accuracyMeters,
        color: '#2563eb',
        weight: 1,
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
      }).addTo(currentLocationMarkers);
    }

    return true;
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
    if (!proposedPlanMarkers || !planMarkers) {
      return 0;
    }

    let locatedCount = 0;

    items.forEach((item) => {
      if (!hasPlanLocation(item.plan) || !isVisiblePlanItem(item, visibility)) {
        return;
      }

      const layer = item.plan.status === 'proposed' ? proposedPlanMarkers : planMarkers;
      const latLng = L.latLng(item.plan.locationLat, item.plan.locationLng);
      const statusLabel = getPlanStatusLabel(locale, item.plan.status);
      const title = `${item.plan.name} · ${item.trip.name} · ${statusLabel}`;
      bounds.extend(latLng);
      locatedCount += 1;

      L.marker(latLng, {
        icon: createPlanMarkerIcon(item.plan, locale, {
          emphasized: typeof item.distanceKm === 'number',
          muted: item.plan.status === 'proposed',
        }),
        keyboard: true,
        title,
      })
        .bindPopup(getPlanPopupHtml(item))
        .addTo(layer);
    });

    return locatedCount;
  }

  function renderMapSummary(payload: GlobalTodayMapPayload, locatedCount: number) {
    const visibleItems = payload.items.filter((item) => isVisiblePlanItem(item, visibility));
    const withoutLocationCount = visibleItems.filter((item) => !hasPlanLocation(item.plan)).length;
    const locationLabel = payload.locationState.location && visibility.currentLocation
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
    lastPayload = payload;

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

    if (!activeMap || !proposedPlanMarkers || !planMarkers || !currentLocationMarkers) {
      setCanvasVisible(false);
      setStatus(t('today.map.unavailable'));
      setSummary('');
      return;
    }

    proposedPlanMarkers.clearLayers();
    planMarkers.clearLayers();
    currentLocationMarkers.clearLayers();

    const bounds = L.latLngBounds([]);
    const locatedCount = renderPlanMarkers(payload.items, bounds);
    const hasVisibleUserLocation = renderUserLocation(payload.locationState, bounds);
    renderMapSummary(payload, locatedCount);
    applyVisibility();

    if (locatedCount === 0 && !hasVisibleUserLocation) {
      setCanvasVisible(false);
      setStatus(t('today.map.empty'));
      return;
    }

    setCanvasVisible(true);

    if (locatedCount === 0) {
      setStatus(t('today.map.onlyUserLocation'));
    } else if (!hasVisibleUserLocation) {
      setStatus(t('today.map.withoutUserLocation').replace('{count}', String(locatedCount)));
    } else {
      setStatus(t('today.map.ready').replace('{count}', String(locatedCount)));
    }

    const signature = getBoundsSignature(payload.items, payload.locationState, visibility);
    requestAnimationFrame(() => fitMapBounds(activeMap, bounds, signature));
  }

  return { sync };
}
