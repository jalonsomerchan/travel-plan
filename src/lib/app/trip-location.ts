import type { TripInput } from './models';

interface TripLocationFormState {
  query: string;
  name: string;
  lat?: number;
  lng?: number;
  hasLatValue: boolean;
  hasLngValue: boolean;
}

function toFiniteCoordinate(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return undefined;
  }

  const coordinate = Number(rawValue);

  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function getTripLocationFormState(form: HTMLFormElement): TripLocationFormState {
  const data = new FormData(form);
  const lat = toFiniteCoordinate(data.get('locationLat'));
  const lng = toFiniteCoordinate(data.get('locationLng'));

  return {
    query: String(data.get('locationQuery') ?? '').trim(),
    name: String(data.get('location') ?? '').trim(),
    lat,
    lng,
    hasLatValue: String(data.get('locationLat') ?? '').trim() !== '',
    hasLngValue: String(data.get('locationLng') ?? '').trim() !== '',
  };
}

export function hasTripLocationCoordinates(trip: Pick<TripInput, 'locationLat' | 'locationLng'>) {
  return typeof trip.locationLat === 'number' && typeof trip.locationLng === 'number';
}

export function getTripLocationValidationKey(form: HTMLFormElement) {
  const state = getTripLocationFormState(form);
  const hasCoordinates = typeof state.lat === 'number' && typeof state.lng === 'number';
  const hasPartialOrInvalidCoordinates = state.hasLatValue || state.hasLngValue;

  if ((state.query || state.name) && !hasCoordinates) {
    return 'trip.form.locationSelectionRequired';
  }

  if (hasPartialOrInvalidCoordinates && !hasCoordinates) {
    return 'trip.form.locationInvalidCoordinates';
  }

  return undefined;
}

export function getTripLocationInputFromForm(form: HTMLFormElement) {
  const state = getTripLocationFormState(form);

  return {
    location: state.name,
    locationLat: state.lat,
    locationLng: state.lng,
  };
}
