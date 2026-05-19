import type { User } from 'firebase/auth';
import { z } from 'zod';
import type { PlanRecord, TripRecord } from '../app/models';
import {
  type AiPlanSuggestionsResponse,
  type TripPlanSuggestionFilters,
  normalizeAiPlanSuggestions,
} from '../app/trip-plan-suggestions';
import { generateAuthenticatedAiApiJson } from './authenticated-api-client';
import { aiGenerationConfig, aiPromptConfig } from './config';
import { AiClientError, logAiError } from './errors';
import { getAiFeatureFlags, isAiAvailable } from './flags';
import { buildJsonPrompt, type JsonValidator } from './json';
import { assertAiClientLimit, registerAiClientUse } from './limits';

const maxExistingPlansInPrompt = 40;
const maxReturnedPlans = 8;

type GenerateTripPlanSuggestionsInput = {
  firebaseUser: User;
  locale: string;
  trip: TripRecord;
  existingPlans: PlanRecord[];
  filters: TripPlanSuggestionFilters;
};

export async function generateTripPlanSuggestions(input: GenerateTripPlanSuggestionsInput) {
  if (!isAiAvailable(getAiFeatureFlags())) {
    throw new AiClientError('disabled', 'AI features are disabled.');
  }

  const projectId = String(import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
  if (!projectId) {
    throw new AiClientError('missing-config', 'Firebase project id is missing for AI suggestions.');
  }

  if (!input.firebaseUser?.getIdToken) {
    throw new AiClientError('missing-config', 'A signed-in Firebase user is required for AI suggestions.');
  }

  assertAiClientLimit(input.firebaseUser.uid);

  try {
    const validator = createTripPlanSuggestionsValidator(input.trip);
    const response = await generateAuthenticatedAiApiJson<AiPlanSuggestionsResponse>({
      token: await input.firebaseUser.getIdToken(),
      projectId,
      systemPrompt: buildTripPlanSuggestionsSystemPrompt(input.locale, input.trip),
      userPrompt: buildTripPlanSuggestionsUserPrompt(input),
      validator,
      timeoutMs: aiGenerationConfig.timeoutMs,
    });

    registerAiClientUse(input.firebaseUser.uid);

    return normalizeAiPlanSuggestions(response, input.trip, input.existingPlans);
  } catch (error) {
    logAiError(error, 'generateTripPlanSuggestions');
    throw normalizeTripPlanSuggestionError(error);
  }
}

export function createTripPlanSuggestionsValidator(trip: TripRecord): JsonValidator<AiPlanSuggestionsResponse> {
  const schema = getTripPlanSuggestionsSchema(trip);
  return (value: unknown): value is AiPlanSuggestionsResponse => schema.safeParse(value).success;
}

function getTripPlanSuggestionsSchema(trip: TripRecord) {
  const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
  const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => value >= trip.startDate && value <= trip.endDate, {
      message: 'Date outside trip range.',
    });

  const planSchema = z
    .object({
      title: z.string().trim().min(2).max(120),
      description: z.string().trim().min(8).max(420),
      type: z.enum(['visit', 'food', 'stay', 'transport', 'museum', 'shop', 'bathroom', 'other']),
      locationName: z.string().trim().min(2).max(180).optional(),
      latitude: z.number().finite().min(-90).max(90).optional(),
      longitude: z.number().finite().min(-180).max(180).optional(),
      suggestedDate: dateSchema.optional(),
      suggestedTime: timeSchema.optional(),
      estimatedDurationMinutes: z.number().int().min(15).max(1440).optional(),
      reason: z.string().trim().min(6).max(240).optional(),
    })
    .superRefine((value, context) => {
      const hasLatitude = typeof value.latitude === 'number';
      const hasLongitude = typeof value.longitude === 'number';

      if (hasLatitude !== hasLongitude) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Coordinates must include both latitude and longitude.',
          path: hasLatitude ? ['longitude'] : ['latitude'],
        });
      }
    });

  return z.object({
    plans: z.array(planSchema).max(maxReturnedPlans),
  });
}

function buildTripPlanSuggestionsSystemPrompt(locale: string, trip: TripRecord) {
  return buildJsonPrompt([
    aiPromptConfig.baseSafety,
    aiPromptConfig.localeInstruction,
    aiPromptConfig.jsonOnly,
    `Locale: ${locale}.`,
    'Task: suggest realistic candidate plans for an existing shared travel itinerary.',
    'Only return concise, practical suggestions that fit the trip dates, destination and transport constraints.',
    'Do not invent impossible routes, contradictory schedules or duplicate existing plans.',
    `The response must be valid JSON with shape {"plans":[{"title":"...","description":"...","type":"visit|food|stay|transport|museum|shop|bathroom|other","locationName":"optional","latitude":0,"longitude":0,"suggestedDate":"YYYY-MM-DD","suggestedTime":"HH:MM","estimatedDurationMinutes":90,"reason":"optional"}]}.`,
    `The trip runs from ${trip.startDate} to ${trip.endDate}. Never suggest dates outside this range.`,
    'Use coordinates only when you are reasonably confident they are accurate. Otherwise omit them.',
  ]);
}

function buildTripPlanSuggestionsUserPrompt(input: GenerateTripPlanSuggestionsInput) {
  const { trip, filters, existingPlans } = input;
  const existingPlansBlock = describeExistingPlans(existingPlans);
  const transportLabel = getTransportPromptLabel(filters.transportMode);

  return buildJsonPrompt([
    `Trip: ${trip.name}.`,
    `Destination context: ${trip.location}.`,
    `Trip dates: ${trip.startDate} to ${trip.endDate}.`,
    `Base search area: ${filters.baseLocation}.`,
    `Search radius: ${Math.round(filters.radiusKm)} km.`,
    `Preferred transport mode: ${transportLabel}.`,
    `Desired plan types: ${filters.types.join(', ')}.`,
    `Requested date window: ${filters.startDate} to ${filters.endDate}.`,
    trip.accommodation?.name
      ? `Accommodation: ${trip.accommodation.name}${trip.accommodation.locationName ? ` | ${trip.accommodation.locationName}` : ''}.`
      : 'Accommodation: not specified.',
    'Avoid recommending obvious duplicates, identical place/time combinations, or plans that clash with the saved itinerary.',
    'Existing saved plans in this trip:',
    existingPlansBlock || '- none',
    `Return up to ${maxReturnedPlans} strong candidate plans. Prefer variety across the selected plan types.`,
  ]);
}

function describeExistingPlans(existingPlans: PlanRecord[]) {
  return existingPlans
    .slice(0, maxExistingPlansInPrompt)
    .map((plan) => {
      const bits = [
        plan.name,
        `type:${plan.category}`,
        plan.date ? `date:${plan.date}` : '',
        plan.time ? `time:${plan.time}` : '',
        plan.locationName ? `location:${plan.locationName}` : '',
        plan.description ? `note:${trimForPrompt(plan.description, 100)}` : '',
      ].filter(Boolean);

      return `- ${bits.join(' | ')}`;
    })
    .join('\n');
}

function getTransportPromptLabel(mode: TripPlanSuggestionFilters['transportMode']) {
  const labels: Record<TripPlanSuggestionFilters['transportMode'], string> = {
    car: 'car',
    bus: 'bus',
    train: 'train',
    plane: 'plane',
    'urban-bus': 'urban bus',
    metro: 'metro',
  };

  return labels[mode];
}

function normalizeTripPlanSuggestionError(error: unknown) {
  if (error instanceof AiClientError) {
    return error;
  }

  return new AiClientError('request-failed', 'AI request failed.', { cause: error, retryable: true });
}

function trimForPrompt(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
