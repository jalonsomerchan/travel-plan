export interface Coordinates {
  latitude: number;
  longitude: number;
}

type LocationCoordinateShape = {
  locationLat?: unknown;
  locationLng?: unknown;
};

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function toCoordinateNumber(
  value: FormDataEntryValue | string | number | null | undefined,
  axis: 'latitude' | 'longitude',
) {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return undefined;
  }

  const coordinate = Number(rawValue);

  if (axis === 'latitude') {
    return isValidLatitude(coordinate) ? coordinate : undefined;
  }

  return isValidLongitude(coordinate) ? coordinate : undefined;
}

export function hasLocationCoordinates(
  value: LocationCoordinateShape | null | undefined,
): value is LocationCoordinateShape & { locationLat: number; locationLng: number } {
  return isValidLatitude(value?.locationLat) && isValidLongitude(value?.locationLng);
}

export function getLocationCoordinates(
  value: LocationCoordinateShape | null | undefined,
): Coordinates | null {
  if (!hasLocationCoordinates(value)) {
    return null;
  }

  return {
    latitude: value.locationLat,
    longitude: value.locationLng,
  };
}

export function formatCoordinatesLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function getCoordinatesLabel(value: LocationCoordinateShape | null | undefined) {
  const coordinates = getLocationCoordinates(value);

  if (!coordinates) {
    return '';
  }

  return formatCoordinatesLabel(coordinates.latitude, coordinates.longitude);
}

export function getDistanceBetweenCoordinates(start: Coordinates, end: Coordinates) {
  const earthRadiusKm = 6371;
  const toRadians = (coordinate: number) => (coordinate * Math.PI) / 180;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
