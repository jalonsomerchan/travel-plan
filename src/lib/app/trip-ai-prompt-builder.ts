import type { Locale } from '../../config/site';
import { buildTripAiPrompt } from './trip-ai-prompt';
import type { PlanRecord, TripRecord } from './models';
import type {
  TripAiPromptAccessMode,
  TripAiPromptBookingMode,
  TripAiPromptBudgetMode,
  TripAiPromptScheduleMode,
  TripAiPromptType,
  TripAiPromptWizardOptions,
} from './trip-ai-prompt-wizard';

function formatBulletList(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'must-see';
}

function getTypeLabels(locale: Locale): Record<TripAiPromptType, string> {
  return locale === 'es'
    ? {
        'must-see': 'sitios imprescindibles',
        museums: 'museos y zonas de interés',
        walks: 'lugares por donde pasear',
        shopping: 'tiendas y zonas de compra',
        food: 'lugares donde comer',
        breakfast: 'sitios donde desayunar',
        dinner: 'lugares donde cenar',
        'hidden-gems': 'sitios escondidos',
        'local-feel': 'lugares para sentirme como un local',
        transport: 'transporte',
        bathrooms: 'baños públicos',
      }
    : {
        'must-see': 'must-see places',
        museums: 'museums and points of interest',
        walks: 'places to walk around',
        shopping: 'shopping areas and stores',
        food: 'places to eat',
        breakfast: 'breakfast places',
        dinner: 'dinner places',
        'hidden-gems': 'hidden gems',
        'local-feel': 'places to feel like a local',
        transport: 'transport',
        bathrooms: 'public bathrooms',
      };
}

function getSelectedTypes(options: TripAiPromptWizardOptions, locale: Locale) {
  const labels = getTypeLabels(locale);
  return options.types.map((type) => labels[type]);
}

function getDateInstruction(options: TripAiPromptWizardOptions, locale: Locale) {
  if (options.dateMode === 'without-dates') {
    return locale === 'es'
      ? '- No asignes date ni time. Todas las recomendaciones deben devolverse sin fecha ni hora.'
      : '- Do not assign date or time. Every recommendation must be returned without a date or time.';
  }

  const selectedDates = options.selectedDates.length > 0 ? options.selectedDates.join(', ') : '';
  const dateScope = selectedDates
    ? locale === 'es'
      ? `- Puedes usar estas fechas del viaje: ${selectedDates}.`
      : `- You may use these trip dates: ${selectedDates}.`
    : locale === 'es'
      ? '- Puedes usar fechas válidas dentro del viaje si aportan valor.'
      : '- You may use valid dates within the trip if they add value.';

  return [
    dateScope,
    getScheduleModeInstruction(options.scheduleMode, locale),
    locale === 'es'
      ? '- Evita duraciones, minutos de visita, bloques horarios rígidos y datos de agenda innecesarios.'
      : '- Avoid durations, visit minutes, rigid time blocks and unnecessary schedule data.',
  ].join('\n');
}

function getScheduleModeInstruction(mode: TripAiPromptScheduleMode, locale: Locale) {
  if (mode === 'independent') {
    return locale === 'es'
      ? '- Cada recomendación debe ser independiente y útil por separado, con una guía IA interesante del sitio.'
      : '- Each recommendation must stand on its own, with an interesting AI guide for the place.';
  }

  return locale === 'es'
    ? '- Puedes ordenar las recomendaciones por días o zonas, pero no escribas una guía de ruta paso a paso.'
    : '- You may order recommendations by days or areas, but do not write a step-by-step route guide.';
}

function getContentInstruction(locale: Locale) {
  return locale === 'es'
    ? '- En aiGuide quiero que me cuentes cosas del sitio: historia, contexto, curiosidades, qué mirar allí y por qué merece la pena.'
    : '- In aiGuide, tell me about the place: history, context, curiosities, what to notice there and why it is worth it.';
}

function getBudgetInstruction(mode: TripAiPromptBudgetMode, locale: Locale) {
  const es = {
    both: '- Puedes mezclar planes gratis y de pago, marcando isPaid correctamente.',
    free: '- Prioriza planes gratis y marca isPaid como false salvo que algo sea claramente de pago.',
    paid: '- Puedes incluir planes de pago y marcar isPaid como true cuando corresponda.',
  };
  const en = {
    both: '- You can mix free and paid plans, setting isPaid correctly.',
    free: '- Prioritize free plans and keep isPaid as false unless something is clearly paid.',
    paid: '- Paid plans are allowed and should set isPaid to true when appropriate.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getBookingInstruction(mode: TripAiPromptBookingMode, locale: Locale) {
  const es = {
    both: '- Puedes incluir sitios con reserva o sin reserva. Recuerda que isBooked significa que requiere reserva.',
    'no-booking': '- Evita sitios que requieran reserva. Usa isBooked como false.',
    'booking-required': '- Prioriza sitios o planes que requieran reserva. Usa isBooked como true cuando haga falta reservar.',
  };
  const en = {
    both: '- You can include places with or without reservations. Remember that isBooked means a reservation is required.',
    'no-booking': '- Avoid places that require reservations. Use isBooked as false.',
    'booking-required': '- Prioritize places or plans that require reservations. Use isBooked as true when booking is needed.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getAccessInstruction(mode: TripAiPromptAccessMode, locale: Locale) {
  const es = {
    public: '- Si aporta valor, añade una nota breve de acceso en transporte público, sin convertirlo en una ruta.',
    walking: '- Si aporta valor, indica si el sitio encaja bien en un paseo, sin guiar paso a paso.',
    car: '- Si aporta valor, añade una nota breve sobre acceso en coche o aparcamiento.',
    mixed: '- Si aporta valor, añade una nota breve con la forma de acceso más razonable.',
  };
  const en = {
    public: '- If useful, add a short public transport note, without turning it into a route.',
    walking: '- If useful, mention whether the place fits well into a walk, without step-by-step guidance.',
    car: '- If useful, add a short note about car access or parking.',
    mixed: '- If useful, add a short note with the most reasonable access option.',
  };

  return locale === 'es' ? es[mode] : en[mode];
}

function getPlaceInstruction(options: TripAiPromptWizardOptions, locale: Locale) {
  const lines = [
    locale === 'es' ? `- Lugar base: ${options.place}.` : `- Base place: ${options.place}.`,
  ];

  if (typeof options.placeLat === 'number' && typeof options.placeLng === 'number') {
    lines.push(
      locale === 'es'
        ? `- Coordenadas base aproximadas: ${options.placeLat.toFixed(5)}, ${options.placeLng.toFixed(5)}.`
        : `- Approximate base coordinates: ${options.placeLat.toFixed(5)}, ${options.placeLng.toFixed(5)}.`,
    );
  }

  return lines.join('\n');
}

function getWizardInstructions(options: TripAiPromptWizardOptions, locale: Locale) {
  return [
    locale === 'es' ? 'Preferencias del usuario:' : 'User preferences:',
    getPlaceInstruction(options, locale),
    getContentInstruction(locale),
    locale === 'es'
      ? `- Tipos de planes a priorizar: ${formatBulletList(getSelectedTypes(options, locale))}.`
      : `- Plan types to prioritize: ${formatBulletList(getSelectedTypes(options, locale))}.`,
    getDateInstruction(options, locale),
    getBudgetInstruction(options.budgetMode, locale),
    getBookingInstruction(options.bookingMode, locale),
    getAccessInstruction(options.accessMode, locale),
  ].join('\n');
}

export function buildTripAiPromptFromWizard(
  trip: TripRecord,
  plans: PlanRecord[],
  locale: Locale,
  options: TripAiPromptWizardOptions,
) {
  return `${buildTripAiPrompt(trip, plans, locale)}\n\n${getWizardInstructions(options, locale)}`;
}
