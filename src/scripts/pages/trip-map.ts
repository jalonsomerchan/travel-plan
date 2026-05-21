import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatPlanMoment } from '../../lib/app/format';
import { getPlanNameWithFlagsHtml } from '../../lib/app/plan-flags';
import type { PlanRecord, TripPointOfInterestRecord, TripRecord } from '../../lib/app/models';
import { shouldShowTripPoiOnMap } from '../../lib/app/trip-pois';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { getPlanCategoryDotStyle } from '../../lib/app/plan-category-colors';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { hasTripLocationCoordinates } from '../../lib/app/trip-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { subscribeTripPointsOfInterest } from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { addMapTools } from '../maps/leaflet-map-tools';
import { splitLocatedPlans } from '../maps/trip-plan-layers';
import {
  accommodationMarkerIcon,
  createPlanMarkerIcon,
  createTripPoiIcon,
  getAccommodationMarkerLabel,
  getPlanPopupHtml,
} from '../maps/trip-markers';
import {
  addMapVisibilityControl,
  getMapVisibilityState,
  type MapVisibilityPreferences,
  syncCurrentLocationVisibility,
} from '../maps/visibility';
import {
  ensureFirebaseReady,
  formatTripDateRange,
  getCategoryLabel,
  getPageTranslator,
  getPlanStatusLabel,
  syncTripNavigation,
  syncTripShell,
} from './shared';

function fitTripMap(map: L.Map, bounds: L.LatLngBounds) {
  map.invalidateSize();

  if (!bounds.isValid()) {
    map.setView([40.4168, -3.7038], 5);
    return;
  }

  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();

  if (northEast.equals(southWest)) {
    map.setView(bounds.getCenter(), 15);
    return;
  }

  map.fitBounds(bounds.pad(0.2), {
    maxZoom: 15,
    padding: [28, 28],
  });
}

function renderPlanList(
  locale: Locale,
  tripId: string,
  plans: PlanRecord[],
  points: TripPointOfInterestRecord[],
) {
  const t = getPageTranslator(locale);
  const target = document.querySelector<HTMLElement>('[data-map-plan-list]');
  const count = document.querySelector<HTMLElement>('[data-map-count]');
  const locatedPlans = plans.filter(hasPlanLocation);
  const visiblePoints = points.filter(shouldShowTripPoiOnMap);

  if (count) {
    count.textContent = String(locatedPlans.length + visiblePoints.length);
  }

  if (!target) {
    return;
  }

  if (locatedPlans.length === 0 && visiblePoints.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('map.empty'))}</article>`;
    return;
  }

  target.innerHTML = [
    ...visiblePoints.map(
      (point) => `
        <article class="app-card-shell">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white" style="background:${escapeHtml(point.color)};">${escapeHtml(resolveTripPoiIcon(point.icon, point.type))}</span>
            <h3 class="text-lg font-bold">${escapeHtml(point.name)}</h3>
          </div>
          <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">${escapeHtml(t(`tripPois.type.${point.type}`))}</p>
          ${point.description ? `<p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(point.description)}</p>` : ''}
          <p class="mt-3 text-sm text-[var(--color-text-muted)]">${escapeHtml(point.locationName)}</p>
          <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">${escapeHtml(t('tripPois.breadcrumb'))}</p>
        </article>
      `,
    ),
    ...locatedPlans
    .map((plan) => {
      const categoryLabel = getCategoryLabel(locale, plan.category);

      return `
        <a class="app-card-shell" href="${getAppUrl(locale, 'plan', { trip: tripId, plan: plan.id })}">
          <div class="flex items-center gap-2">
            <span class="plan-category-dot" style="${getPlanCategoryDotStyle(plan.category)}" aria-hidden="true"></span>
            <h3 class="min-w-0 text-lg font-bold text-[var(--color-text)]">${getPlanNameWithFlagsHtml(plan, t)}</h3>
          </div>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(categoryLabel)} · ${escapeHtml(getPlanStatusLabel(locale, plan.status))}</p>
          <p class="mt-3 text-sm text-[var(--color-text-muted)]">${escapeHtml(getPlanLocationLabel(plan))}</p>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(formatPlanMoment(plan, locale) || t('calendar.unscheduled'))}</p>
        </a>
      `;
    }),
  ].join('');
}

function addAccommodationMarker(trip: TripRecord | null, markers: L.LayerGroup, bounds: L.LatLngBounds) {
  const accommodation = trip?.accommodation;

  if (!hasAccommodationLocation(accommodation)) {
    return;
  }

  const label = getAccommodationMarkerLabel(accommodation);
  const latLng = L.latLng(accommodation.locationLat, accommodation.locationLng);
  bounds.extend(latLng);

  L.marker(latLng, {
    icon: accommodationMarkerIcon,
    keyboard: true,
    title: label,
  })
    .bindPopup(escapeHtml(label))
    .addTo(markers);
}

function addTripLocationFallback(trip: TripRecord | null, bounds: L.LatLngBounds) {
  if (!trip || hasAccommodationLocation(trip.accommodation) || !hasTripLocationCoordinates(trip)) {
    return;
  }

  bounds.extend(L.latLng(trip.locationLat, trip.locationLng));
}

function syncLayerVisibility(map: L.Map, layer: L.LayerGroup, visible: boolean) {
  if (visible && !map.hasLayer(layer)) {
    layer.addTo(map);
  }

  if (!visible && map.hasLayer(layer)) {
    layer.removeFrom(map);
  }
}

export function mountTripMapPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const tripName = document.querySelector<HTMLElement>('[data-map-trip-name]');
  const backTripLink = document.querySelector<HTMLAnchorElement>('#map-back-trip-link');
  const calendarLink = document.querySelector<HTMLAnchorElement>('#map-calendar-link');
  const mapCanvas = document.querySelector<HTMLElement>('[data-trip-map-canvas]');
  const subscriptions = createSubscriptionScope();
  let currentTrip: TripRecord | null = null;
  let currentPlans: PlanRecord[] = [];
  let currentPoints: TripPointOfInterestRecord[] = [];
  let visibility = getMapVisibilityState();

  if (!tripId || !mapCanvas) {
    if (tripName) {
      tripName.textContent = t('trip.missingId');
    }
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  if (backTripLink) {
    backTripLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  if (calendarLink) {
    calendarLink.href = getAppUrl(locale, 'calendar', { trip: tripId });
  }

  const map = L.map(mapCanvas, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([40.4168, -3.7038], 5);

  addMapTools(map, t, { currentLocation: { centerOnLocation: false, locateOnLoad: true } });

  const proposedPlanMarkers = L.layerGroup().addTo(map);
  const planMarkers = L.layerGroup().addTo(map);
  const accommodationMarkers = L.layerGroup().addTo(map);
  const poiMarkers = L.layerGroup().addTo(map);

  const applyVisibility = (nextVisibility: MapVisibilityPreferences) => {
    visibility = nextVisibility;
    syncLayerVisibility(map, proposedPlanMarkers, visibility.proposedPlans);
    syncLayerVisibility(map, planMarkers, visibility.plans);
    syncLayerVisibility(map, accommodationMarkers, visibility.accommodation);
    syncLayerVisibility(map, poiMarkers, visibility.tripPois);
    syncCurrentLocationVisibility(visibility.currentLocation);
  };

  const resetState = () => {
    currentTrip = null;
    currentPlans = [];
    currentPoints = [];
  };

  const syncMap = () => {
    const { proposedPlans, plans } = splitLocatedPlans(currentPlans);
    renderPlanList(locale, tripId, currentPlans, currentPoints);
    proposedPlanMarkers.clearLayers();
    planMarkers.clearLayers();
    accommodationMarkers.clearLayers();
    poiMarkers.clearLayers();

    const bounds = L.latLngBounds([]);

    const renderPlanMarker = (plan: PlanRecord, layer: L.LayerGroup) => {
      if (!hasPlanLocation(plan)) {
        return;
      }

      if (!visibility.categories[plan.category]) {
        return;
      }

      const categoryLabel = getCategoryLabel(locale, plan.category);
      const latLng = L.latLng(plan.locationLat, plan.locationLng);
      bounds.extend(latLng);

      L.marker(latLng, {
        icon: createPlanMarkerIcon(plan, locale),
        keyboard: true,
        title: plan.name,
      })
        .bindPopup(getPlanPopupHtml(locale, tripId, plan, categoryLabel, getPlanLocationLabel(plan), t))
        .addTo(layer);
    };

    proposedPlans.forEach((plan) => renderPlanMarker(plan, proposedPlanMarkers));
    plans.forEach((plan) => renderPlanMarker(plan, planMarkers));

    addAccommodationMarker(currentTrip, accommodationMarkers, bounds);
    addTripLocationFallback(currentTrip, bounds);

    currentPoints.filter(shouldShowTripPoiOnMap).forEach((point) => {
      const latLng = L.latLng(point.locationLat, point.locationLng);
      bounds.extend(latLng);
      L.marker(latLng, {
        icon: createTripPoiIcon(point),
        keyboard: true,
        title: point.name,
      })
        .bindPopup(
          `<strong>${escapeHtml(point.name)}</strong><br />${escapeHtml(t(`tripPois.type.${point.type}`))}<br />${escapeHtml(point.locationName)}${point.description ? `<br />${escapeHtml(point.description)}` : ''}`,
        )
        .addTo(poiMarkers);
    });

    applyVisibility(visibility);
    requestAnimationFrame(() => fitTripMap(map, bounds));
  };

  addMapVisibilityControl(map, t, (nextVisibility) => {
    visibility = nextVisibility;
    syncMap();
  });

  window.addEventListener('pagehide', () => subscriptions.clear(), { once: true });

  observeSession((user) => {
    subscriptions.clear();
    resetState();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        currentTrip = trip;
        if (tripName) {
          tripName.textContent = trip
            ? `${trip.name} · ${formatTripDateRange(locale, trip)}`
            : t('trip.notFound');
        }
        if (trip) {
          syncTripShell(locale, trip);
        }
        syncMap();
      }),
    );

    subscriptions.add(
      subscribeTripPlans(tripId, (plans) => {
        currentPlans = plans;
        syncMap();
      }),
    );

    subscriptions.add(
      subscribeTripPointsOfInterest(tripId, (points) => {
        currentPoints = points;
        syncMap();
      }),
    );
  });
}
