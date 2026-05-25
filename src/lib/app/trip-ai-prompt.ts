import type { Locale } from '../../config/site';
import {
  planCategoryValues,
  planStatusValues,
  type PlanCategory,
  type PlanInput,
  type PlanRecord,
  type PlanStatus,
  type TripRecord,
} from './models';
import { isSafeExternalPlanUrl, normalizePlanLinks, validatePlanLinks } from './plan-links';

export interface TripAiPromptCandidate extends PlanInput {
  sourceIndex: number;
}

export interface TripAiPromptParseResult {
  candidates: TripAiPromptCandidate[];
  errorKey?: string;
}

const allowedCategories = new Set<PlanCategory>(planCategoryValues);
const allowedStatuses = new Set<PlanStatus>(planStatusValues);
const urlLikePattern = /https?:\/\/\S+/gi;

function formatValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatAccommodation(trip: TripRecord, locale: Locale) {
  const empty = locale === 'es' ? 'No configurado' : 'Not configured';

  if (!trip.accommodation) {
    return empty;
  }

  return [trip.accommodation.name, trip.accommodation.locationName]
    .filter(Boolean)
    .join(' · ') || empty;
}

function formatPromptPlace(trip: TripRecord, locale: Locale) {
  if (trip.accommodation?.locationName?.trim()) {
    return trip.accommodation.locationName.trim();
  }

  return formatValue(trip.location, locale === 'es' ? 'Destino sin concretar' : 'Unknown destination');
}

function formatExistingPlans(plans: PlanRecord[], locale: Locale) {
  if (plans.length === 0) {
    return locale === 'es' ? 'Todavía no hay planes guardados.' : 'There are no saved plans yet.';
  }

  return plans
    .map((plan) => `- ${plan.name} (${plan.category}${plan.date ? ` · ${plan.date}` : ''})`)
    .join('\n');
}

export function buildTripAiPrompt(trip: TripRecord, plans: PlanRecord[], locale: Locale) {
  const categories = planCategoryValues.join(', ');
  const tripLocation = formatPromptPlace(trip, locale);
  const accommodation = formatAccommodation(trip, locale);
  const existingPlans = formatExistingPlans(plans, locale);

  if (locale === 'en') {
    return `You are an expert local travel curator. Create useful place proposals for this trip and return only valid JSON, without markdown fences or extra comments.

Trip data:
- Trip name: ${trip.name}
- Destination: ${tripLocation}
- Accommodation: ${accommodation}
- Dates: from ${trip.startDate} to ${trip.endDate}
- Already saved plans, to avoid duplicates:\n${existingPlans}

Return a JSON object with this exact structure:
{
  "plans": [
    {
      "name": "Short plain-text place or plan title",
      "description": "Short summary and practical notes. Put sources or reference links here, never in name.",
      "category": "visit",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "locationName": "Specific place or area",
      "locationLat": 0,
      "locationLng": 0,
      "isPaid": false,
      "isBooked": false,
      "needsReservation": false,
      "isOptional": false,
      "isImportant": false,
      "links": [{ "label": "Official website", "url": "https://example.com" }]
    }
  ]
}

Rules:
- Create between 8 and 18 useful proposals, avoiding duplicates with saved plans.
- Use only these categories: ${categories}.
- status is optional. If you include it, use "proposed". If you omit it, TravelPlan will save it as proposed.
- Use dates within the trip range only.
- Do not include aiGuide, guide, audioGuide or any audio-guide field in the JSON.
- Do not include duration, visit length, estimated minutes, schedule blocks or rigid route-guide data in description.
- Coordinates are optional, but include them when you are reasonably confident.
- links is optional and must only contain http or https URLs.
- needsReservation means the place or plan requires a reservation or booking in advance.
- isBooked means you already have a booking, ticket or confirmation. For AI suggestions, keep isBooked as false unless the user explicitly says it is already booked.
- Do not invent reservations. If something is only a recommendation, keep isBooked as false.
- isOptional is optional in the JSON. If omitted, TravelPlan will save it as false.
- Keep name as a clean plain-text title: no links, no URLs, no markdown, no citations, no source names and no JSON fragments.
- If you need to include a source, link, citation or official website, put it in description or links, never in name.
- Return only JSON.`;
  }

  return `Actúa como una IA experta en viajes y cultura local. Crea propuestas útiles de sitios o planes para este viaje y devuelve solo JSON válido, sin bloques markdown ni comentarios extra.

Datos del viaje:
- Nombre del viaje: ${trip.name}
- Destino: ${tripLocation}
- Alojamiento: ${accommodation}
- Fechas: del ${trip.startDate} al ${trip.endDate}
- Planes ya guardados, para evitar duplicados:\n${existingPlans}

Devuelve un objeto JSON con esta estructura exacta:
{
  "plans": [
    {
      "name": "Título corto y limpio del sitio o plan",
      "description": "Resumen corto y notas prácticas. Si hay fuentes o enlaces de referencia, ponlos aquí, nunca en name.",
      "category": "visit",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "locationName": "Lugar o zona concreta",
      "locationLat": 0,
      "locationLng": 0,
      "isPaid": false,
      "isBooked": false,
      "needsReservation": false,
      "isOptional": false,
      "isImportant": false,
      "links": [{ "label": "Web oficial", "url": "https://example.com" }]
    }
  ]
}

Reglas:
- Crea entre 8 y 18 propuestas útiles, evitando duplicados con los planes guardados.
- Usa solo estas categorías: ${categories}.
- status es opcional. Si lo incluyes, usa "proposed". Si lo omites, TravelPlan lo guardará como propuesto.
- Usa únicamente fechas dentro del rango del viaje.
- No incluyas aiGuide, guide, audioGuide ni ningún campo de audioguía en el JSON.
- No incluyas duración, tiempo estimado, minutos de visita, bloques horarios ni datos rígidos de guía/ruta en description.
- Las coordenadas son opcionales, pero inclúyelas si estás razonablemente seguro.
- links es opcional y solo debe contener URLs http o https.
- needsReservation significa que el sitio o plan requiere reserva previa.
- isBooked significa que ya tienes reserva, entrada o confirmación. Para sugerencias IA, deja isBooked como false salvo que el usuario diga expresamente que ya está reservado.
- No inventes reservas. Si algo es una recomendación, deja isBooked como false.
- isOptional es opcional en el JSON. Si se omite, TravelPlan lo guardará como false.
- Mantén name como un título limpio en texto plano: sin enlaces, sin URLs, sin markdown, sin citas, sin nombres de fuente y sin fragmentos JSON.
- Si necesitas incluir una fuente, enlace, cita o web oficial, ponlo en description o links, nunca en name.
- Devuelve solo JSON.`;
}

export function getChatGptPromptUrl(prompt: string) {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

function getString(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string');
  return typeof value === 'string' ? value.trim() : '';
}

function getBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCategory(value: string): PlanCategory {
  return allowedCategories.has(value as PlanCategory) ? (value as PlanCategory) : 'visit';
}

function normalizeStatus(value: string): PlanStatus {
  return allowedStatuses.has(value as PlanStatus) ? (value as PlanStatus) : 'proposed';
}

function getPlansPayload(parsed: unknown) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { plans?: unknown }).plans)) {
    return (parsed as { plans: unknown[] }).plans;
  }

  return null;
}

function getTitleSources(value: string) {
  return [...new Set(value.match(urlLikePattern) ?? [])];
}

function cleanPlanName(value: string) {
  return value
    .replace(urlLikePattern, '')
    .replace(/[{}<>[\]()]/g, ' ')
    .replace(/%22|&quot;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.\-]+|[\s:;,.\-]+$/g, '')
    .trim();
}

function getDescriptionWithTitleSources(description: string, rawName: string) {
  const sources = getTitleSources(rawName);

  if (sources.length === 0) {
    return description;
  }

  const sourceText = `Referencia: ${sources.join(', ')}`;
  return [description, sourceText].filter(Boolean).join('\n\n');
}

function normalizeCandidate(item: unknown, index: number): TripAiPromptCandidate | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const rawName = getString(record, ['name', 'title']);
  const name = cleanPlanName(rawName);

  if (!name) {
    return null;
  }

  const links = normalizePlanLinks(record.links);
  const linksValidation = validatePlanLinks(links);
  const safeLinks = linksValidation.valid ? links : links.filter((link) => isSafeExternalPlanUrl(link.url));

  return {
    sourceIndex: index,
    name,
    description: getDescriptionWithTitleSources(getString(record, ['description', 'notes', 'reason']), rawName),
    category: normalizeCategory(getString(record, ['category', 'type'])),
    date: getString(record, ['date']) || undefined,
    time: getString(record, ['time']) || undefined,
    status: normalizeStatus(getString(record, ['status'])),
    locationName: getString(record, ['locationName', 'location', 'place']) || undefined,
    locationLat: getNumber(record, 'locationLat'),
    locationLng: getNumber(record, 'locationLng'),
    isPaid: getBoolean(record, 'isPaid'),
    isBooked: getBoolean(record, 'isBooked'),
    needsReservation: getBoolean(record, 'needsReservation'),
    isOptional: getBoolean(record, 'isOptional'),
    isImportant: getBoolean(record, 'isImportant'),
    links: safeLinks,
  };
}

export function parseTripAiPromptJson(value: string): TripAiPromptParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return { candidates: [], errorKey: 'tripAiPrompt.error.invalidJson' };
  }

  const payload = getPlansPayload(parsed);

  if (!payload) {
    return { candidates: [], errorKey: 'tripAiPrompt.error.missingPlans' };
  }

  const candidates = payload
    .map((item, index) => normalizeCandidate(item, index))
    .filter((item): item is TripAiPromptCandidate => Boolean(item));

  return {
    candidates,
    errorKey: candidates.length === 0 ? 'tripAiPrompt.error.noValidPlans' : undefined,
  };
}
