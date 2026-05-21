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

  return locale === 'es'
    ? `- Puedes asignar date entre ${options.startDate || 'el inicio del viaje'} y ${options.endDate || 'el final del viaje'} si aporta valor, pero evita duraciones, minutos y bloques horarios.`
    : `- You may assign date between ${options.startDate || 'the trip start'} and ${options.endDate || 'the trip end'} when useful, but avoid durations, minutes and schedule blocks.`;
}

function getModeInstruction(options: TripAiPromptWizardOptions, locale: Locale) {
  if (options.planMode === 'independent') {
    return locale === 'es'
      ? '- Devuelve planes independientes, con una descripción completa e interesante de cada sitio.'
      : '- Return independent plans, with a complete and interesting description of each place.';
  }

  return locale === 'es'
    ? '- Puedes ordenar las propuestas por día o zona, pero no escribas una guía de ruta paso a paso.'
    : '- You may order proposals by day or area, but do not write a step-by-step route guide.';
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
    public: '- Si aporta valor, añade una nota muy breve de acceso en transporte público, sin convertirlo en una ruta.',
    walking: '- Si aporta valor, indica si el sitio encaja bien en un paseo, sin guiar paso a paso.',
    car: '- Si aporta valor, añade una nota muy breve sobre acceso en coche o aparcamiento.',
    mixed: '- Si aporta valor, añade una nota muy breve con la forma de acceso más razonable.',
  };
  const en = {
    public: '- If useful, add a very short public transport note, without turning it into a route.',
    walking: '- If useful, mention whether the place fits well into a walk, without step-by-step guidance.',
    car: '- If useful, add a very short note about car access or parking.',
    mixed: '- If useful, add a very short note with the most reasonable access option.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getContentInstruction(locale: Locale) {
  return locale === 'es'
    ? '- En description quiero que me cuentes cosas del sitio: historia, contexto, curiosidades, qué mirar allí y por qué merece la pena.'
    : '- In description, tell me about the place: history, context, curiosities, what to notice there and why it is worth it.';
}

function getWizardInstructions(options: TripAiPromptWizardOptions, locale: Locale) {
  const lines = [
    locale === 'es' ? 'Preferencias del usuario:' : 'User preferences:',
    locale === 'es' ? `- Lugar principal: ${options.place}` : `- Main place: ${options.place}`,
    getContentInstruction(locale),
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
