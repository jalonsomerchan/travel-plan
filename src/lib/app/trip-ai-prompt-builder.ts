import type { Locale } from '../../config/site';
import { buildTripAiPrompt } from './trip-ai-prompt';
import type { PlanRecord, TripRecord } from './models';
import type { TripAiPromptWizardOptions } from './trip-ai-prompt-wizard';

function formatList(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'visit';
}

function getDateInstruction(options: TripAiPromptWizardOptions, locale: Locale) {
  if (options.dateMode === 'unscheduled') {
    return locale === 'es'
      ? '- No asignes date ni time: devuelve planes sin fecha para guardarlos sin programar.'
      : '- Do not assign date or time: return unscheduled plans so they can be saved without dates.';
  }

  if (locale === 'es') {
    return `- Planifica usando fechas entre ${options.startDate || 'el inicio del viaje'} y ${options.endDate || 'el final del viaje'}, con horas realistas.`;
  }

  return `- Schedule plans between ${options.startDate || 'the trip start'} and ${options.endDate || 'the trip end'}, with realistic times.`;
}

function getModeInstruction(options: TripAiPromptWizardOptions, locale: Locale) {
  if (options.planMode === 'independent') {
    return locale === 'es'
      ? '- Devuelve planes independientes, útiles por separado, sin obligar a seguir un itinerario cerrado.'
      : '- Return independent plans that are useful separately, without forcing a fixed itinerary.';
  }

  return locale === 'es'
    ? '- Devuelve una planificación coherente, ordenada y fácil de seguir por días o bloques.'
    : '- Return a coherent itinerary ordered by days or blocks and easy to follow.';
}

function getTourismInstruction(style: TripAiPromptWizardOptions['tourismStyle'], locale: Locale) {
  const es = {
    balanced: '- Mezcla imprescindibles turísticos con sitios más locales o menos masificados.',
    touristic: '- Prioriza lugares turísticos, conocidos e imprescindibles para una primera visita.',
    local: '- Prioriza planes menos turísticos, barrios, experiencias locales y lugares menos masificados.',
  };
  const en = {
    balanced: '- Mix tourist highlights with more local or less crowded places.',
    touristic: '- Prioritize well-known tourist highlights and must-sees for a first visit.',
    local: '- Prioritize less touristy plans, neighborhoods, local experiences and less crowded places.',
  };

  return locale === 'es' ? es[style] : en[style];
}

function getBudgetInstruction(mode: TripAiPromptWizardOptions['budgetMode'], locale: Locale) {
  const es = {
    both: '- Incluye planes gratuitos y de pago cuando merezca la pena, marcando isPaid correctamente.',
    free: '- Prioriza planes gratuitos. Evita planes de pago salvo que sean realmente imprescindibles.',
    paid: '- Puedes incluir planes de pago. Marca isPaid como true cuando corresponda.',
  };
  const en = {
    both: '- Include free and paid plans when worthwhile, setting isPaid correctly.',
    free: '- Prioritize free plans. Avoid paid plans unless they are truly essential.',
    paid: '- Paid plans are allowed. Set isPaid to true when appropriate.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getAccessInstruction(mode: TripAiPromptWizardOptions['accessMode'], locale: Locale) {
  const es = {
    public: '- Explica en description cómo llegar usando transporte público cuando sea útil.',
    walking: '- Prioriza planes accesibles caminando o agrupables a pie. Explica rutas a pie cuando sea útil.',
    car: '- Ten en cuenta desplazamientos en coche y añade notas prácticas de acceso o aparcamiento si procede.',
    mixed: '- Combina caminar, transporte público y coche según tenga más sentido. Explica cómo llegar en description.',
  };
  const en = {
    public: '- Explain in description how to get there by public transport when useful.',
    walking: '- Prioritize places reachable on foot or easy to group by walking. Explain walking routes when useful.',
    car: '- Consider car transfers and add practical access or parking notes when relevant.',
    mixed: '- Combine walking, public transport and car when it makes sense. Explain how to get there in description.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getWizardInstructions(options: TripAiPromptWizardOptions, locale: Locale) {
  const lines = [
    locale === 'es' ? 'Preferencias del usuario:' : 'User preferences:',
    locale === 'es' ? `- Lugar principal: ${options.place}` : `- Main place: ${options.place}`,
    getDateInstruction(options, locale),
    getModeInstruction(options, locale),
    locale === 'es'
      ? `- Usa preferentemente estos tipos de plan: ${formatList(options.types)}.`
      : `- Prefer these plan types: ${formatList(options.types)}.`,
    getTourismInstruction(options.tourismStyle, locale),
    getBudgetInstruction(options.budgetMode, locale),
    getAccessInstruction(options.accessMode, locale),
  ];

  return lines.join('\n');
}

export function buildTripAiPromptFromWizard(
  trip: TripRecord,
  plans: PlanRecord[],
  locale: Locale,
  options: TripAiPromptWizardOptions,
) {
  return `${buildTripAiPrompt(trip, plans, locale)}\n\n${getWizardInstructions(options, locale)}`;
}
