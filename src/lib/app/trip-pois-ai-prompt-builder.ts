import type { Locale } from '../../config/site';
import { type TripPoiType } from '../../config/trip-pois';
import { buildTripPoiAiPrompt } from './trip-pois-ai-prompt';
import type { TripRecord } from './models';
import type { TripPoiAiPromptWizardOptions } from './trip-pois-ai-prompt-wizard';

function getTypeLabel(type: TripPoiType, locale: Locale) {
  const labelsEs: Record<TripPoiType, string> = {
    restaurant: 'restaurantes',
    cafe: 'cafeterías',
    public_toilet: 'baños públicos',
    metro_station: 'estaciones de metro',
    train_station: 'estaciones de tren',
    bus_station: 'estaciones de bus',
    airport: 'aeropuertos',
    fountain: 'fuentes',
    bar: 'bares',
    landmark: 'lugares destacados',
    other: 'otros puntos útiles',
  };

  const labelsEn: Record<TripPoiType, string> = {
    restaurant: 'restaurants',
    cafe: 'cafes',
    public_toilet: 'public toilets',
    metro_station: 'metro stations',
    train_station: 'train stations',
    bus_station: 'bus stations',
    airport: 'airports',
    fountain: 'fountains',
    bar: 'bars',
    landmark: 'landmarks',
    other: 'other useful points',
  };

  return locale === 'es' ? labelsEs[type] : labelsEn[type];
}

function getWizardInstructions(options: TripPoiAiPromptWizardOptions, locale: Locale) {
  const lines = [
    locale === 'es' ? 'Preferencias del usuario:' : 'User preferences:',
    locale === 'es' ? `- Lugar base: ${options.place}.` : `- Base place: ${options.place}.`,
    locale === 'es'
      ? `- Tipo de punto de interés a generar: ${getTypeLabel(options.type, locale)}.`
      : `- Point-of-interest type to generate: ${getTypeLabel(options.type, locale)}.`,
    locale === 'es'
      ? `- Usa exactamente este valor en el campo type del JSON: "${options.type}".`
      : `- Use exactly this value in the JSON type field: "${options.type}".`,
  ];

  if (typeof options.placeLat === 'number' && typeof options.placeLng === 'number') {
    lines.push(
      locale === 'es'
        ? `- Coordenadas base aproximadas: ${options.placeLat.toFixed(5)}, ${options.placeLng.toFixed(5)}.`
        : `- Approximate base coordinates: ${options.placeLat.toFixed(5)}, ${options.placeLng.toFixed(5)}.`,
    );
  }

  lines.push(
    locale === 'es'
      ? '- Evita duplicados claros y prioriza puntos razonables cerca de la zona indicada.'
      : '- Avoid obvious duplicates and prioritize sensible points close to the selected area.',
  );

  return lines.join('\n');
}

export function buildTripPoiAiPromptFromWizard(
  trip: TripRecord,
  locale: Locale,
  options: TripPoiAiPromptWizardOptions,
) {
  return `${buildTripPoiAiPrompt(trip, locale)}\n\n${getWizardInstructions(options, locale)}`;
}
