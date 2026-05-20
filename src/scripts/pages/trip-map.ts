import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getAccommodationLocationLabel,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { formatPlanMoment } from '../../lib/app/format';
import type { PlanRecord, TripPointOfInterestRecord, TripRecord } from '../../lib/app/models';
import {
  getPlanCategoryColors,
  getPlanCategoryDotStyle,
} from '../../lib/app/plan-category-colors';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribeTripPlans } from '../../lib/firebase/plans';
import { subscribeTripPointsOfInterest } from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { addMapTools } from '../maps/leaflet-map-tools';
import {
  ensureFirebaseReady,
  formatTripDateRange,
  getCategoryLabel,
  getPageTranslator,
  getPlanStatusLabel,
  syncTripNavigation,
  syncTripShell,
} from './shared';

const accommodationMarkerIcon = L.divIcon({
  className: 'trip-map-accommodation-marker',
  html: `
    <span aria-hidden="true" style="align-items:center;background:#0f766e;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;height:38px;justify-content:center;width:38px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 11.4 12 4l9 7.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V20h4.25v-5.5h4.5V20h4.25v-9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `,
  iconAnchor: [19, 38],
  iconSize: [38, 38],
  popupAnchor: [0, -38],
});

const poiIcons: Record<string, string> = {
  camera: '◎',
  food: '◆',
  pin: '●',
  star: '★',
  view: '▲',
};

function createTripPoiIcon(point: TripPointOfInterestRecord) {
  return L.divIcon({
    className: 'trip-map-poi-marker',
    html: `
      <span aria-hidden="true" style="align-items:center;background:#2563eb;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;font-weight:900;height:34px;justify-content:center;width:34px;">
        ${escapeHtml(poiIcons[point.icon] ?? poiIcons.pin)}
      </span>
    `,
    iconAnchor: [17, 34],
    iconSize: [34, 34],
    popupAnchor: [0, -34],
  });
}

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

  if (count) {
    count.textContent = String(locatedPlans.length + points.length);
  }

  if (!target) {
    return;
  }

  if (locatedPlans.length === 0 && points.length === 0) {
    target.innerHTML = `<article class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-8 text-center text-sm text-[var(--color-text-soft)]">${escapeHtml(t('map.empty'))}</article>`;
    return;
  }

  target.innerHTML = [
    ...points.map(
      (point) => `
        <article class="app-card-shell">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]">${escapeHtml(poiIcons[point.icon] ?? poiIcons.pin)}</span>
            <h3 class="text-lg font-bold">${escapeHtml(point.name)}</h3>
          </div>
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
            <h3 class="text-lg font-bold">${escapeHtml(plan.name)}</h3>
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

  const label = getAccommodationLocationLabel(accommodation) || accommodation.name;
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

export function mountTripMapPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const tripName = document.querySelector<HTMLElement>('[data-map-trip-name]');
  const backTripLink = document.querySelector<HTMLAnchorElement>('#map-back-trip-link');
  const calendarLink = document.querySelector<HTMLAnchorElement>('#map-calendar-link');
  const mapCanvas = document.querySelector<HTMLElement>('[data-trip-map-canvas]');
  let currentTrip: TripRecord | null = null;
  let currentPlans: PlanRecord[] = [];
  let currentPoints: TripPointOfInterestRecord[] = [];

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

  const markers = L.layerGroup().addTo(map);

  const syncMap = () => {
    const locatedPlans = currentPlans.filter(hasPlanLocation);
    renderPlanList(locale, tripId, currentPlans, currentPoints);
    markers.clearLayers();

    const bounds = L.latLngBounds([]);

    locatedPlans.forEach((plan) => {
      if (!hasPlanLocation(plan)) {
        return;
      }

      const categoryLabel = getCategoryLabel(locale, plan.category);
      const colors = getPlanCategoryColors(plan.category);
      const latLng = L.latLng(plan.locationLat, plan.locationLng);
      bounds.extend(latLng);

      L.circleMarker(latLng, {
        radius: 9,
        color: colors.border,
        fillColor: colors.fill,
        fillOpacity: 0.9,
        weight: 3,
      })
        .bindPopup(
          `
            <strong>${escapeHtml(plan.name)}</strong><br />
            ${escapeHtml(getPlanLocationLabel(plan))}<br />
            ${escapeHtml(categoryLabel)}
          `,
        )
        .addTo(markers);
    });

    addAccommodationMarker(currentTrip, markers, bounds);

    currentPoints.forEach((point) => {
      const latLng = L.latLng(point.locationLat, point.locationLng);
      bounds.extend(latLng);
      L.marker(latLng, {
        icon: createTripPoiIcon(point),
        keyboard: true,
        title: point.name,
      })
        .bindPopup(`<strong>${escapeHtml(point.name)}</strong><br />${escapeHtml(point.locationName)}`)
        .addTo(markers);
    });

    requestAnimationFrame(() => fitTripMap(map, bounds));
  };

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

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
    });

    subscribeTripPlans(tripId, (plans) => {
      currentPlans = plans;
      syncMap();
    });

    subscribeTripPointsOfInterest(tripId, (points) => {
      currentPoints = points;
      syncMap();
    });
  });
}
