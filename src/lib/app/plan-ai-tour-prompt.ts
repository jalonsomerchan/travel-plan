import type { Locale } from '../../config/site';
import type { PlanRecord, TripRecord } from './models';

export const planAiTourToneValues = ['serious', 'fun', 'storyteller'] as const;
export const planAiTourLengthValues = ['short', 'standard', 'detailed'] as const;
export const planAiTourFocusValues = ['history', 'practical', 'mixed'] as const;

export type PlanAiTourTone = (typeof planAiTourToneValues)[number];
export type PlanAiTourLength = (typeof planAiTourLengthValues)[number];
export type PlanAiTourFocus = (typeof planAiTourFocusValues)[number];

export interface PlanAiTourPromptOptions {
  tone: PlanAiTourTone;
  length: PlanAiTourLength;
  focus: PlanAiTourFocus;
}

function formatPlanLocation(plan: PlanRecord, locale: Locale) {
  if (plan.locationName?.trim()) {
    return plan.locationName.trim();
  }

  return locale === 'es' ? 'Sin localización concreta' : 'No specific location';
}

function formatPlanDate(plan: PlanRecord, locale: Locale) {
  if (!plan.date && !plan.time) {
    return locale === 'es' ? 'Sin fecha ni hora cerradas' : 'No fixed date or time';
  }

  return [plan.date, plan.time].filter(Boolean).join(' · ');
}

function formatAccommodation(trip: TripRecord, locale: Locale) {
  if (!trip.accommodation) {
    return locale === 'es' ? 'Sin alojamiento guardado' : 'No saved accommodation';
  }

  return [trip.accommodation.name, trip.accommodation.locationName].filter(Boolean).join(' · ');
}

function getToneInstruction(tone: PlanAiTourTone, locale: Locale) {
  const es = {
    serious: 'Usa un tono claro, culto y fiable, como una audioguía seria.',
    fun: 'Usa un tono ameno, divertido y con chispa, sin perder utilidad.',
    storyteller: 'Usa un tono narrativo, evocador y cercano, como un guía que cuenta historias.',
  };
  const en = {
    serious: 'Use a clear, cultured and reliable tone, like a serious audio guide.',
    fun: 'Use a lively, fun tone with personality, without losing usefulness.',
    storyteller: 'Use a narrative, vivid and approachable tone, like a guide telling stories.',
  };

  return locale === 'es' ? es[tone] : en[tone];
}

function getLengthInstruction(length: PlanAiTourLength, locale: Locale) {
  const es = {
    short: 'Haz un tour breve, directo y fácil de leer en uno o dos minutos.',
    standard: 'Haz un tour equilibrado, con contexto suficiente sin alargarte demasiado.',
    detailed: 'Haz un tour detallado, con contexto, curiosidades y sugerencias concretas.',
  };
  const en = {
    short: 'Make it brief, direct and easy to read in one or two minutes.',
    standard: 'Make it balanced, with enough context without getting too long.',
    detailed: 'Make it detailed, with context, curiosities and concrete suggestions.',
  };

  return locale === 'es' ? es[length] : en[length];
}

function getFocusInstruction(focus: PlanAiTourFocus, locale: Locale) {
  const es = {
    history: 'Prioriza historia, contexto cultural, anécdotas y por qué este sitio merece la pena.',
    practical: 'Prioriza utilidad práctica: cómo recorrerlo, qué mirar, cómo organizar la visita y consejos rápidos.',
    mixed: 'Mezcla contexto histórico con consejos prácticos de visita de forma equilibrada.',
  };
  const en = {
    history: 'Prioritize history, cultural context, anecdotes and why this place matters.',
    practical: 'Prioritize practical usefulness: how to walk it, what to notice, how to structure the visit and quick tips.',
    mixed: 'Mix historical context with practical visiting tips in a balanced way.',
  };

  return locale === 'es' ? es[focus] : en[focus];
}

export function buildPlanAiTourPrompt(
  trip: TripRecord,
  plan: PlanRecord,
  locale: Locale,
  options: PlanAiTourPromptOptions,
) {
  if (locale === 'en') {
    return `Act as an expert local guide and create a self-guided tour script for this saved trip plan.

Trip context:
- Trip: ${trip.name}
- Destination: ${trip.location}
- Accommodation: ${formatAccommodation(trip, locale)}
- Trip dates: ${trip.startDate} to ${trip.endDate}

Plan context:
- Plan name: ${plan.name}
- Category: ${plan.category}
- Description: ${plan.description || 'No extra description'}
- Place: ${formatPlanLocation(plan, locale)}
- Planned moment: ${formatPlanDate(plan, locale)}
- Paid: ${plan.isPaid ? 'yes' : 'no'}
- Reservation required: ${plan.isBooked ? 'yes' : 'no'}

Style instructions:
- ${getToneInstruction(options.tone, locale)}
- ${getLengthInstruction(options.length, locale)}
- ${getFocusInstruction(options.focus, locale)}

What I want:
- Write the response as a tour that I can read or listen to while I am there.
- Start with a short intro that explains what this place is and why it matters.
- Then guide me through the visit step by step, in a logical walking order when possible.
- Point out what to notice, what to imagine, what details are easy to miss, and what makes the place special.
- If useful, include brief practical notes such as best route, expected timing, crowd tips, or where to pause.
- If the plan location is broad, turn it into a realistic mini route around the area instead of inventing exact facts.
- If something is uncertain, do not invent it. Phrase it carefully.
- Do not return JSON.
- Do not mention that you are an AI.

Format:
- Use a clear title.
- Use short sections or paragraphs that are comfortable to follow on mobile.
- End with a short closing recommendation or best final viewpoint/stop if it makes sense.`;
  }

  return `Actúa como un guía local experto y crea un texto de tour autoguiado para este plan guardado del viaje.

Contexto del viaje:
- Viaje: ${trip.name}
- Destino: ${trip.location}
- Alojamiento: ${formatAccommodation(trip, locale)}
- Fechas del viaje: del ${trip.startDate} al ${trip.endDate}

Contexto del plan:
- Nombre del plan: ${plan.name}
- Categoría: ${plan.category}
- Descripción: ${plan.description || 'Sin descripción extra'}
- Lugar: ${formatPlanLocation(plan, locale)}
- Momento previsto: ${formatPlanDate(plan, locale)}
- De pago: ${plan.isPaid ? 'sí' : 'no'}
- Requiere reserva: ${plan.isBooked ? 'sí' : 'no'}

Instrucciones de estilo:
- ${getToneInstruction(options.tone, locale)}
- ${getLengthInstruction(options.length, locale)}
- ${getFocusInstruction(options.focus, locale)}

Qué quiero:
- Escribe la respuesta como un tour que yo pueda leer o escuchar mientras estoy allí.
- Empieza con una introducción breve que explique qué es este sitio y por qué merece la pena.
- Después guíame paso a paso por la visita, en un orden lógico de recorrido si es posible.
- Señala en qué fijarme, qué imaginar, qué detalles suelen pasarse por alto y qué hace especial el lugar.
- Si ayuda, añade notas prácticas breves como mejor recorrido, tiempo estimado, consejos de afluencia o dónde detenerse.
- Si el lugar del plan es una zona amplia, conviértelo en una mini ruta realista por esa zona sin inventarte datos exactos.
- Si algo no está claro, no lo inventes. Exprésalo con prudencia.
- No devuelvas JSON.
- No menciones que eres una IA.

Formato:
- Usa un título claro.
- Usa secciones o párrafos cortos, cómodos de seguir en móvil.
- Termina con una recomendación final breve o con el mejor punto donde acabar, si tiene sentido.`;
}
