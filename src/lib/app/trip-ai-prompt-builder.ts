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
        viewpoints: 'miradores y puntos panoramicos',
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
        viewpoints: 'viewpoints and scenic spots',
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
      ? `- Usa solo estas fechas del viaje: ${selectedDates}.`
      : `- Use only these trip dates: ${selectedDates}.`
    : locale === 'es'
      ? '- Usa solo fechas válidas dentro del viaje.'
      : '- Use valid dates within the trip only.';

  return [
    dateScope,
    getScheduleModeInstruction(options.scheduleMode, locale),
  ].join('\n');
}

function getScheduleModeInstruction(mode: TripAiPromptScheduleMode, locale: Locale) {
  if (mode === 'independent') {
    return locale === 'es'
      ? '- Aunque uses fechas, cada recomendación debe ser independiente y útil por separado, sin formar un itinerario cerrado.'
      : '- Even when using dates, each recommendation must stand on its own instead of forming a rigid itinerary.';
  }

  return locale === 'es'
    ? '- Ordena las recomendaciones como una planificación coherente por días y horas, con un ritmo realista.'
    : '- Order the recommendations as a coherent plan by days and times, with a realistic pace.';
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
    public: '- Explica de forma práctica cómo llegar en transporte público cuando aporte valor.',
    walking: '- Prioriza lugares cómodos para ir caminando y explica accesos a pie cuando tenga sentido.',
    car: '- Ten en cuenta desplazamientos en coche y añade notas útiles de acceso o aparcamiento.',
    mixed: '- Explica cómo llegar con la opción más lógica en cada caso: andando, transporte público o coche.',
  };
  const en = {
    public: '- Explain practical public transport access when it adds value.',
    walking: '- Prioritize places that are easy to reach on foot and explain walking access when useful.',
    car: '- Consider car transfers and add useful parking or access notes.',
    mixed: '- Explain the most sensible way to get there in each case: walking, public transport or car.',
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
