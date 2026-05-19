import type { TripAccommodationRecord } from './models';

export function hasAccommodationLocation(
  accommodation: Pick<TripAccommodationRecord, 'locationLat' | 'locationLng'> | undefined,
) {
  return (
    typeof accommodation?.locationLat === 'number' && typeof accommodation.locationLng === 'number'
  );
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
    return `${accommodation.locationLat?.toFixed(5)}, ${accommodation.locationLng?.toFixed(5)}`;
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
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const startLatitude = toRadians(latitudeA);
  const endLatitude = toRadians(latitudeB);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
