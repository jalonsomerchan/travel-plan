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
    return `Act as an expert local guide and create a self-guided audio-guide narration for this saved trip plan.

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
- Write only a continuous plain-text narration, ready to be read aloud.
- Make it sound like a tourist guide speaking directly to the traveller while they are at the place.
- Explain what the place is, why it matters, what to imagine, what to notice and what makes it special.
- Use natural paragraphs and one narrated flow.
- Integrate practical tips naturally inside the narration, never as bullets or a checklist.
- If the plan location is broad, turn it into a realistic mini route around the area instead of inventing exact facts.
- If something is uncertain, do not invent it. Phrase it carefully.
- Do not return JSON.
- Do not mention that you are an AI.
- Do not use titles, headings, sections, lists, tables, quotes, notes, sources, footnotes, bullet-point notes or Markdown formatting.
- Return only the narration text.`;
  }

  return `Actúa como un guía local experto y crea una narración de audioguía autoguiada para este plan guardado del viaje.

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
- Escribe únicamente una narración continua en texto plano, lista para ser leída en voz alta.
- Debe sonar como un guía turístico hablando directamente al viajero mientras está allí.
- Explica qué es el lugar, por qué merece la pena, qué imaginar, en qué fijarse y qué lo hace especial.
- Usa párrafos naturales y un único flujo narrado.
- Integra los consejos prácticos dentro de la narración, nunca como bullets ni checklist.
- Si el lugar del plan es una zona amplia, conviértelo en una mini ruta realista por esa zona sin inventarte datos exactos.
- Si algo no está claro, no lo inventes. Exprésalo con prudencia.
- No devuelvas JSON.
- No menciones que eres una IA.
- No uses títulos, encabezados, secciones, listas, tablas, citas, notas, fuentes, notas al pie, apuntes ni formato Markdown.
- Devuelve solo el texto de la narración.`;
}
