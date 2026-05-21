import {
  defaultTripPoiType,
  tripPoiTypeMeta,
  tripPoiTypeValues,
  type TripPoiType,
} from '../../config/trip-pois';

const tripPoiColorPattern = /^#[0-9a-f]{6}$/i;

export function isTripPoiType(value: string): value is TripPoiType {
  return tripPoiTypeValues.includes(value as TripPoiType);
}

export function normalizeTripPoiType(value: string | undefined) {
  return value && isTripPoiType(value) ? value : defaultTripPoiType;
}

export function getTripPoiTypeMeta(type: string | undefined) {
  return tripPoiTypeMeta[normalizeTripPoiType(type)];
}

export function getTripPoiDefaultIcon(type: string | undefined) {
  return getTripPoiTypeMeta(type).defaultIcon;
}

export function getTripPoiDefaultColor(type: string | undefined) {
  return getTripPoiTypeMeta(type).defaultColor;
}

export function normalizeTripPoiColor(color: string | undefined, type: string | undefined) {
  const value = color?.trim() ?? '';

  if (tripPoiColorPattern.test(value)) {
    return value.toLowerCase();
  }

  return getTripPoiDefaultColor(type);
}

export function shouldShowTripPoiOnMap(point: { isVisible: boolean }) {
  return point.isVisible;
}
