import type { Locale } from '../../config/site';
import type { TripPointOfInterestInput, TripRecord } from './models';
import {
  getTripPoiDefaultColor,
  getTripPoiDefaultIcon,
  normalizeTripPoiColor,
  normalizeTripPoiType,
} from './trip-pois';

export interface TripPoiAiPromptCandidate extends TripPointOfInterestInput {
  sourceIndex: number;
}

export interface TripPoiAiPromptParseResult {
  candidates: TripPoiAiPromptCandidate[];
  errorKey?: string;
}

function formatPromptPlace(trip: TripRecord, locale: Locale) {
  if (trip.accommodation?.locationName?.trim()) {
    return trip.accommodation.locationName.trim();
  }

  return trip.location.trim() || (locale === 'es' ? 'Destino sin concretar' : 'Unknown destination');
}

export function buildTripPoiAiPrompt(trip: TripRecord, locale: Locale) {
  const tripLocation = formatPromptPlace(trip, locale);

  if (locale === 'en') {
    return `You are a local travel assistant. Suggest useful points of interest for this trip and return only valid JSON, without markdown fences or extra commentary.

Trip data:
- Trip name: ${trip.name}
- Destination: ${tripLocation}
- Dates: from ${trip.startDate} to ${trip.endDate}

Return a JSON object with this exact structure:
{
  "points": [
    {
      "name": "Short clean point name",
      "description": "Short practical summary",
      "type": "restaurant",
      "icon": "food",
      "color": "#ef4444",
      "locationName": "Specific place or address",
      "locationLat": 0,
      "locationLng": 0,
      "isVisible": true
    }
  ]
}

Rules:
- Create between 6 and 12 useful points.
- Coordinates are required. Do not return points without valid latitude and longitude.
- Keep names clean: no links, no markdown, no citations, no extra labels.
- type must be one of the values explicitly requested later in the prompt.
- icon and color are optional, but if you include them they must match the point type naturally.
- description should be short and practical.
- isVisible can be omitted. If omitted, it will default to true.
- Return only JSON.`;
  }

  return `Actúa como una IA de ayuda local para viajes. Sugiere puntos de interés útiles para este viaje y devuelve solo JSON válido, sin bloques markdown ni comentarios extra.

Datos del viaje:
- Nombre del viaje: ${trip.name}
- Destino: ${tripLocation}
- Fechas: del ${trip.startDate} al ${trip.endDate}

Devuelve un objeto JSON con esta estructura exacta:
{
  "points": [
    {
      "name": "Nombre corto y limpio del punto",
      "description": "Resumen práctico y breve",
      "type": "restaurant",
      "icon": "food",
      "color": "#ef4444",
      "locationName": "Lugar o dirección concreta",
      "locationLat": 0,
      "locationLng": 0,
      "isVisible": true
    }
  ]
}

Reglas:
- Crea entre 6 y 12 puntos útiles.
- Las coordenadas son obligatorias. No devuelvas puntos sin latitud y longitud válidas.
- Mantén los nombres limpios: sin enlaces, sin markdown, sin citas y sin etiquetas extra.
- type debe ser uno de los valores pedidos explícitamente más adelante en el prompt.
- icon y color son opcionales, pero si los incluyes deben encajar de forma natural con el tipo.
- description debe ser corta y práctica.
- isVisible se puede omitir. Si se omite, se guardará como true.
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
  return record[key] !== false;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getPointsPayload(parsed: unknown) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { points?: unknown }).points)) {
    return (parsed as { points: unknown[] }).points;
  }

  return null;
}

function cleanPoiName(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[{}<>[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.\-]+|[\s:;,.\-]+$/g, '')
    .trim();
}

function normalizeCandidate(item: unknown, index: number): TripPoiAiPromptCandidate | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const rawName = getString(record, ['name', 'title']);
  const name = cleanPoiName(rawName);
  const type = normalizeTripPoiType(getString(record, ['type']));
  const locationLat = getNumber(record, 'locationLat');
  const locationLng = getNumber(record, 'locationLng');

  if (!name || typeof locationLat !== 'number' || typeof locationLng !== 'number') {
    return null;
  }

  return {
    sourceIndex: index,
    name,
    description: getString(record, ['description', 'notes', 'reason']),
    type,
    icon: getString(record, ['icon']) || getTripPoiDefaultIcon(type),
    color: normalizeTripPoiColor(getString(record, ['color']), type),
    isVisible: getBoolean(record, 'isVisible'),
    locationName: getString(record, ['locationName', 'location', 'place']) || name,
    locationLat,
    locationLng,
  };
}

export function parseTripPoiAiPromptJson(value: string): TripPoiAiPromptParseResult {
  try {
    const parsed = JSON.parse(value) as unknown;
    const points = getPointsPayload(parsed);

    if (!points) {
      return { candidates: [], errorKey: 'tripPoisAiPrompt.import.invalidShape' };
    }

    const candidates = points
      .map((item, index) => normalizeCandidate(item, index))
      .filter((item): item is TripPoiAiPromptCandidate => Boolean(item));

    return {
      candidates,
      errorKey: candidates.length === 0 ? 'tripPoisAiPrompt.import.empty' : undefined,
    };
  } catch {
    return { candidates: [], errorKey: 'tripPoisAiPrompt.import.invalidJson' };
  }
}
