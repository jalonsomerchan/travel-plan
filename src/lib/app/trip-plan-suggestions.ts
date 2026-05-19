import type { PlanCategory, PlanInput, PlanRecord, TripRecord } from './models';

export const tripSuggestionTransportValues = ['car', 'bus', 'train', 'plane', 'urban-bus', 'metro'] as const;

export type TripSuggestionTransportMode = (typeof tripSuggestionTransportValues)[number];

export interface TripPlanSuggestionFilters {
  baseLocation: string;
  radiusKm: number;
  transportMode: TripSuggestionTransportMode;
  types: PlanCategory[];
  startDate: string;
  endDate: string;
}

export interface AiPlanSuggestion {
  title: string;
  description: string;
  type: PlanCategory;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  suggestedDate?: string;
  suggestedTime?: string;
  estimatedDurationMinutes?: number;
  reason?: string;
}

export interface AiPlanSuggestionsResponse {
  plans: AiPlanSuggestion[];
}

export function getTripPlanSuggestionFilters(form: HTMLFormElement): TripPlanSuggestionFilters {
  const data = new FormData(form);
  const selectedTypes = data
    .getAll('types')
    .map((value) => String(value))
    .filter(isPlanCategory);

  return {
    baseLocation: normalizeText(String(data.get('baseLocation') ?? '')),
    radiusKm: Number(data.get('radiusKm') ?? 0),
    transportMode: isTransportMode(data.get('transportMode'))
      ? data.get('transportMode')
      : tripSuggestionTransportValues[0],
    types: selectedTypes,
    startDate: String(data.get('startDate') ?? ''),
    endDate: String(data.get('endDate') ?? ''),
  };
}

export function validateTripPlanSuggestionFilters(filters: TripPlanSuggestionFilters, trip: TripRecord) {
  if (filters.baseLocation.length < 2) {
    return 'baseLocation';
  }

  if (!Number.isFinite(filters.radiusKm) || filters.radiusKm < 1 || filters.radiusKm > 300) {
    return 'radiusKm';
  }

  if (!isTransportMode(filters.transportMode)) {
    return 'transportMode';
  }

  if (filters.types.length === 0) {
    return 'types';
  }

  if (!isIsoDate(filters.startDate) || !isIsoDate(filters.endDate)) {
    return 'dates';
  }

  if (filters.startDate > filters.endDate) {
    return 'dateOrder';
  }

  if (filters.startDate < trip.startDate || filters.endDate > trip.endDate) {
    return 'tripRange';
  }

  return null;
}

export function normalizeAiPlanSuggestions(
  response: AiPlanSuggestionsResponse,
  trip: TripRecord,
  existingPlans: PlanRecord[],
) {
  const seen = new Set<string>();

  return response.plans
    .map((plan) => normalizeSuggestion(plan))
    .filter((plan) => !hasPlanConflict(plan, trip, existingPlans, seen));
}

export function toPlanInputFromAiSuggestion(plan: AiPlanSuggestion): PlanInput {
  return {
    name: plan.title,
    description: plan.description,
    category: plan.type,
    locationName: plan.locationName,
    locationLat: plan.latitude,
    locationLng: plan.longitude,
    date: plan.suggestedDate,
    time: plan.suggestedTime,
    status: 'pending',
  };
}

export function formatSuggestionCoordinates(plan: Pick<AiPlanSuggestion, 'latitude' | 'longitude'>) {
  if (typeof plan.latitude !== 'number' || typeof plan.longitude !== 'number') {
    return '';
  }

  return `${plan.latitude.toFixed(5)}, ${plan.longitude.toFixed(5)}`;
}

export function isDateWithinTrip(date: string | undefined, trip: TripRecord) {
  if (!date) {
    return true;
  }

  return date >= trip.startDate && date <= trip.endDate;
}

function normalizeSuggestion(plan: AiPlanSuggestion): AiPlanSuggestion {
  return {
    title: normalizeText(plan.title),
    description: normalizeText(plan.description),
    type: plan.type,
    locationName: normalizeOptionalText(plan.locationName),
    latitude: typeof plan.latitude === 'number' ? plan.latitude : undefined,
    longitude: typeof plan.longitude === 'number' ? plan.longitude : undefined,
    suggestedDate: plan.suggestedDate || undefined,
    suggestedTime: plan.suggestedTime || undefined,
    estimatedDurationMinutes:
      typeof plan.estimatedDurationMinutes === 'number' ? Math.round(plan.estimatedDurationMinutes) : undefined,
    reason: normalizeOptionalText(plan.reason),
  };
}

function hasPlanConflict(
  suggestion: AiPlanSuggestion,
  trip: TripRecord,
  existingPlans: PlanRecord[],
  seen: Set<string>,
) {
  if (!isDateWithinTrip(suggestion.suggestedDate, trip)) {
    return true;
  }

  const titleKey = normalizeKey(suggestion.title);
  const locationKey = normalizeKey(suggestion.locationName);
  const signature = [
    titleKey,
    suggestion.type,
    suggestion.suggestedDate ?? '',
    suggestion.suggestedTime ?? '',
    locationKey,
  ].join('|');

  if (seen.has(signature)) {
    return true;
  }

  const collidesWithExisting = existingPlans.some((plan) => {
    const planTitleKey = normalizeKey(plan.name);
    const planLocationKey = normalizeKey(plan.locationName);
    const sameTitle = titleKey && planTitleKey === titleKey;
    const sameLocation = locationKey && planLocationKey === locationKey;
    const sameDate = Boolean(suggestion.suggestedDate && plan.date === suggestion.suggestedDate);
    const sameTime = Boolean(suggestion.suggestedTime && plan.time === suggestion.suggestedTime);

    if (sameTitle && (!suggestion.suggestedDate || sameDate || sameLocation)) {
      return true;
    }

    return sameDate && sameTime && suggestion.type === plan.category && (sameLocation || sameTitle);
  });

  if (collidesWithExisting) {
    return true;
  }

  seen.add(signature);
  return false;
}

function isTransportMode(value: FormDataEntryValue | null): value is TripSuggestionTransportMode {
  return typeof value === 'string' && tripSuggestionTransportValues.includes(value as TripSuggestionTransportMode);
}

function isPlanCategory(value: string): value is PlanCategory {
  return ['visit', 'food', 'stay', 'transport', 'museum', 'shop', 'bathroom', 'other'].includes(value);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value ?? '');
  return normalized || undefined;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeKey(value: string | undefined) {
  return normalizeOptionalText(value)?.toLocaleLowerCase() ?? '';
}
