import type { TripAccommodationRecord } from './models';
import {
  formatCoordinatesLabel,
  getDistanceBetweenCoordinates as getCoordinatesDistanceKm,
  hasLocationCoordinates,
} from './coordinates';

export function hasAccommodationLocation(
  accommodation: Pick<TripAccommodationRecord, 'locationLat' | 'locationLng'> | undefined,
) {
  return hasLocationCoordinates(accommodation);
}

export function getAccommodationLocationLabel(
  accommodation:
    | Pick<TripAccommodationRecord, 'locationName' | 'locationLat' | 'locationLng'>
    | undefined,
) {
  if (accommodation?.locationName) {
    return accommodation.locationName;
  }

  if (hasAccommodationLocation(accommodation)) {
    return formatCoordinatesLabel(accommodation.locationLat, accommodation.locationLng);
  }

  return '';
}

export function getAccommodationInputFromForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const name = String(data.get('accommodationName') ?? '').trim();
  const locationLat = String(data.get('accommodationLocationLat') ?? '').trim();
  const locationLng = String(data.get('accommodationLocationLng') ?? '').trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    locationName: String(data.get('accommodationLocationName') ?? '').trim() || undefined,
    locationLat: locationLat ? Number(locationLat) : undefined,
    locationLng: locationLng ? Number(locationLng) : undefined,
  };
}

export function getDistanceBetweenCoordinates(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  return getCoordinatesDistanceKm(
    { latitude: latitudeA, longitude: longitudeA },
    { latitude: latitudeB, longitude: longitudeB },
  );
}
