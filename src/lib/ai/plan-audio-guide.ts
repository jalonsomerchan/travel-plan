import type { User } from 'firebase/auth';
import { z } from 'zod';
import { normalizeAiGuideText } from '../app/ai-guide-text';
import type { PlanRecord, TripRecord } from '../app/models';
import { generateAuthenticatedAiApiJson } from './authenticated-api-client';
import { aiGenerationConfig } from './config';
import { AiClientError, logAiError } from './errors';
import { getAiFeatureFlags, isAiAvailable } from './flags';
import { buildJsonPrompt, type JsonValidator } from './json';
import { assertAiClientLimit, registerAiClientUse } from './limits';

const minGuideLength = 180;
const maxGuideLength = 5000;

type GeneratePlanAudioGuideInput = {
  firebaseUser: User;
  locale: string;
  trip: TripRecord;
  plan: PlanRecord;
};

type PlanAudioGuideResponse = {
  audioGuide: string;
};

export async function generatePlanAudioGuide(input: GeneratePlanAudioGuideInput) {
  if (!isAiAvailable(getAiFeatureFlags())) {
    throw new AiClientError('disabled', 'AI features are disabled.');
  }

  const projectId = String(import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
  if (!projectId) {
    throw new AiClientError('missing-config', 'Firebase project id is missing for AI audio guides.');
  }

  assertAiClientLimit(input.firebaseUser.uid);

  try {
    const response = await generateAuthenticatedAiApiJson<PlanAudioGuideResponse>({
      token: await input.firebaseUser.getIdToken(),
      projectId,
      systemPrompt: buildPlanAudioGuideSystemPrompt(input.locale),
      userPrompt: buildPlanAudioGuideUserPrompt(input),
      validator: createPlanAudioGuideValidator(),
      timeoutMs: aiGenerationConfig.timeoutMs,
    });
    const audioGuide = normalizeAiGuideText(response.audioGuide);

    if (!audioGuide) {
      throw new AiClientError('invalid-response', 'AI audio guide response was empty after normalization.');
    }

    registerAiClientUse(input.firebaseUser.uid);
    return audioGuide;
  } catch (error) {
    logAiError(error, 'generatePlanAudioGuide');
    throw normalizePlanAudioGuideError(error);
  }
}

function createPlanAudioGuideValidator(): JsonValidator<PlanAudioGuideResponse> {
  const schema = z.object({
    audioGuide: z.string().trim().min(minGuideLength).max(maxGuideLength),
  });

  return (value: unknown): value is PlanAudioGuideResponse => schema.safeParse(value).success;
}

function buildPlanAudioGuideSystemPrompt(locale: string) {
  return buildJsonPrompt([
    `Locale: ${locale}. Respond in that locale.`,
    'Task: write an entertaining audio-guide narration for one saved travel plan.',
    'Return only valid JSON with shape {"audioGuide":"..."}.',
    'The audioGuide value must be plain narration text, ready to be read aloud.',
    'Tone: fun, curious, vivid and friendly, with history, context, legends, anecdotes and memorable details.',
    'Do not include logistics, advice, routes, visit duration, ticket notes, opening hours, meeting points, headings, bullet lists or stage directions.',
    'Avoid invented exact dates, names or claims when uncertain. Prefer broad historical context and safe cultural framing.',
  ]);
}

function buildPlanAudioGuideUserPrompt({ trip, plan }: GeneratePlanAudioGuideInput) {
  return buildJsonPrompt([
    `Trip name: ${trimForPrompt(trip.name, 120)}.`,
    `Destination context: ${trimForPrompt(trip.location, 180)}.`,
    trip.startDate || trip.endDate ? `Trip dates: ${trip.startDate || 'not set'} to ${trip.endDate || 'not set'}.` : '',
    trip.accommodation?.name
      ? `Accommodation context: ${trimForPrompt(trip.accommodation.name, 120)}${trip.accommodation.locationName ? ` | ${trimForPrompt(trip.accommodation.locationName, 180)}` : ''}.`
      : '',
    `Plan title: ${trimForPrompt(plan.name, 160)}.`,
    `Plan category: ${plan.category}.`,
    plan.locationName ? `Plan location: ${trimForPrompt(plan.locationName, 220)}.` : '',
    plan.description ? `Saved plan notes: ${trimForPrompt(plan.description, 900)}.` : '',
    plan.aiGuide ? `Previous guide, only as context: ${trimForPrompt(plan.aiGuide, 900)}.` : '',
    'Create one polished audio guide about the place or experience itself. Make it enjoyable and rich in curiosities, history and context. Do not add practical notes or positioning instructions.',
  ]);
}

function normalizePlanAudioGuideError(error: unknown) {
  if (error instanceof AiClientError) {
    return error;
  }

  return new AiClientError('request-failed', 'AI audio guide request failed.', { cause: error, retryable: true });
}

function trimForPrompt(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
