import type { PlanCategory, PlanInput, PlanRecord, TripRecord } from './models';

export const tripSuggestionTransportValues = ['', 'walk', 'bicycle', 'public-transport'] as const;
export const tripSuggestionBudgetValues = ['free', 'paid', 'both'] as const;

export type TripSuggestionTransportMode = (typeof tripSuggestionTransportValues)[number];
export type TripSuggestionBudgetMode = (typeof tripSuggestionBudgetValues)[number];

export interface TripPlanSuggestionFilters {
  baseLocation: string;
  baseLatitude?: number;
  baseLongitude?: number;
  radiusKm: number;
  transportMode: TripSuggestionTransportMode;
  budgetMode: TripSuggestionBudgetMode;
  types: PlanCategory[];
  startDate: string;
  endDate: string;
}

export interface AiPlanSuggestion {
  title: string;
  description: string;
  type: PlanCategory;
  latitude: number;
  longitude: number;
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
  const baseLocationName = normalizeText(String(data.get('baseLocationName') ?? ''));
  const baseLocationQuery = normalizeText(String(data.get('baseLocationQuery') ?? ''));
  const baseLat = String(data.get('baseLocationLat') ?? '');
  const baseLng = String(data.get('baseLocationLng') ?? '');

  return {
    baseLocation: baseLocationName || baseLocationQuery,
    baseLatitude: baseLat ? Number(baseLat) : undefined,
    baseLongitude: baseLng ? Number(baseLng) : undefined,
    radiusKm: Number(data.get('radiusKm') ?? 0),
    transportMode: isTransportMode(data.get('transportMode'))
      ? data.get('transportMode')
      : tripSuggestionTransportValues[0],
    budgetMode: isBudgetMode(data.get('budgetMode'))
      ? data.get('budgetMode')
      : tripSuggestionBudgetValues[2],
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

  if (!isBudgetMode(filters.budgetMode)) {
    return 'budgetMode';
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
    locationName: undefined,
    locationLat: plan.latitude,
    locationLng: plan.longitude,
    status: 'pending',
  };
}

export function formatSuggestionCoordinates(plan: Pick<AiPlanSuggestion, 'latitude' | 'longitude'>) {
  return `${plan.latitude.toFixed(5)}, ${plan.longitude.toFixed(5)}`;
}

function normalizeSuggestion(plan: AiPlanSuggestion): AiPlanSuggestion {
  return {
    title: normalizeText(plan.title),
    description: normalizeText(plan.description),
    type: plan.type,
    latitude: plan.latitude,
    longitude: plan.longitude,
  };
}

function hasPlanConflict(
  suggestion: AiPlanSuggestion,
  _trip: TripRecord,
  existingPlans: PlanRecord[],
  seen: Set<string>,
) {
  const titleKey = normalizeKey(suggestion.title);
  const signature = [
    titleKey,
    suggestion.type,
    suggestion.latitude.toFixed(5),
    suggestion.longitude.toFixed(5),
  ].join('|');

  if (seen.has(signature)) {
    return true;
  }

  const collidesWithExisting = existingPlans.some((plan) => {
    const planTitleKey = normalizeKey(plan.name);
    const sameTitle = titleKey && planTitleKey === titleKey;
    const sameCoordinates =
      typeof plan.locationLat === 'number' &&
      typeof plan.locationLng === 'number' &&
      Math.abs(plan.locationLat - suggestion.latitude) < 0.0005 &&
      Math.abs(plan.locationLng - suggestion.longitude) < 0.0005;

    return suggestion.type === plan.category && (sameTitle || sameCoordinates);
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

function isBudgetMode(value: FormDataEntryValue | null): value is TripSuggestionBudgetMode {
  return typeof value === 'string' && tripSuggestionBudgetValues.includes(value as TripSuggestionBudgetMode);
}

function isPlanCategory(value: string): value is PlanCategory {
  return ['visit', 'viewpoint', 'food', 'stay', 'transport', 'museum', 'shop', 'bathroom', 'other'].includes(value);
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
