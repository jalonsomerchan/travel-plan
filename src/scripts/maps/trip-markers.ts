import L from 'leaflet';
import type { Locale } from '../../config/site';
import { getAccommodationLocationLabel } from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import type {
  PlanRecord,
  TripAccommodationRecord,
  TripPointOfInterestRecord,
} from '../../lib/app/models';
import { getPlanCategoryColors } from '../../lib/app/plan-category-colors';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { getCategoryLabel } from '../pages/shared';

interface PlanMarkerOptions {
  emphasized?: boolean;
  muted?: boolean;
}

export const accommodationMarkerIcon = L.divIcon({
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

export function createTripPoiIcon(point: TripPointOfInterestRecord) {
  return L.divIcon({
    className: 'trip-map-poi-marker',
    html: `
      <span aria-hidden="true" style="align-items:center;background:rgba(37,99,235,.42);border:none;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.18);color:#ffffff;display:flex;font-weight:900;height:34px;justify-content:center;width:34px;">
        ${escapeHtml(resolveTripPoiIcon(point.icon))}
      </span>
    `,
    iconAnchor: [17, 34],
    iconSize: [34, 34],
    popupAnchor: [0, -34],
  });
}

export function createPlanMarkerIcon(plan: PlanRecord, locale: Locale, options: PlanMarkerOptions = {}) {
  const categoryLabel = getCategoryLabel(locale, plan.category);
  const colors = getPlanCategoryColors(plan.category);
  const classes = [
    'trip-map-plan-marker',
    options.emphasized ? 'trip-map-plan-marker--emphasized' : '',
    options.muted ? 'trip-map-plan-marker--muted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return L.divIcon({
    className: classes,
    html: `
      <span class="trip-map-plan-marker-badge" aria-hidden="true" style="--plan-marker-fill:${colors.fill};--plan-marker-border:${colors.border};"></span>
      <span class="trip-map-plan-marker-label">${escapeHtml(plan.name)}</span>
    `,
    iconAnchor: [12, 12],
    iconSize: [156, 52],
    popupAnchor: [0, -12],
    title: categoryLabel,
  });
}

export function getAccommodationMarkerLabel(accommodation: TripAccommodationRecord) {
  return getAccommodationLocationLabel(accommodation) || accommodation.name;
}
