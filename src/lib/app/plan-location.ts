import type { PlanInput, PlanRecord } from './models';
import {
  formatCoordinatesLabel,
  hasLocationCoordinates,
  toCoordinateNumber,
} from './coordinates';

interface PlanLocationFormState {
  query: string;
  name: string;
  lat?: number;
  lng?: number;
  hasLatValue: boolean;
  hasLngValue: boolean;
}

function getPlanLocationFormState(form: HTMLFormElement): PlanLocationFormState {
  const data = new FormData(form);
  const lat = toCoordinateNumber(data.get('locationLat'), 'latitude');
  const lng = toCoordinateNumber(data.get('locationLng'), 'longitude');

  return {
    query: String(data.get('locationQuery') ?? '').trim(),
    name: String(data.get('locationName') ?? '').trim(),
    lat,
    lng,
    hasLatValue: String(data.get('locationLat') ?? '').trim() !== '',
    hasLngValue: String(data.get('locationLng') ?? '').trim() !== '',
  };
}

export function hasPlanLocation(plan: Pick<PlanRecord, 'locationLat' | 'locationLng'>) {
  return hasLocationCoordinates(plan);
}

export function getPlanLocationLabel(plan: Pick<PlanRecord, 'locationName' | 'locationLat' | 'locationLng'>) {
  if (plan.locationName) {
    return plan.locationName;
  }

  if (hasPlanLocation(plan)) {
    return formatCoordinatesLabel(plan.locationLat, plan.locationLng);
  }

  return '';
}

export function getPlanLocationValidationKey(form: HTMLFormElement) {
  const state = getPlanLocationFormState(form);
  const hasCoordinates = typeof state.lat === 'number' && typeof state.lng === 'number';
  const hasPartialOrInvalidCoordinates = state.hasLatValue || state.hasLngValue;

  if ((state.query || state.name) && !hasCoordinates) {
    return 'plan.location.selectionRequired';
  }

  if (hasPartialOrInvalidCoordinates && !hasCoordinates) {
    return 'plan.location.invalidCoordinates';
  }

  return undefined;
}

export function getPlanInputFromForm(form: HTMLFormElement): PlanInput {
  const data = new FormData(form);
  const location = getPlanLocationFormState(form);

  return {
    name: String(data.get('name') ?? ''),
    description: String(data.get('description') ?? ''),
    category: String(data.get('category') ?? 'visit') as PlanRecord['category'],
    isPaid: data.get('isPaid') === 'on',
    isBooked: data.get('isBooked') === 'on',
    needsReservation: data.get('needsReservation') === 'on',
    isOptional: data.get('isOptional') === 'on',
    isImportant: data.get('isImportant') === 'on',
    locationName: location.name || undefined,
    locationLat: location.lat,
    locationLng: location.lng,
    date: String(data.get('date') ?? '') || undefined,
    time: String(data.get('time') ?? '') || undefined,
    status: String(data.get('status') ?? 'pending') as PlanRecord['status'],
  };
}
