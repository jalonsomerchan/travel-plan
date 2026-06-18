import type { Locale } from '../config/site';
import type { PublicPageContent } from './public-page-types';
import type { PublicGuideTopic } from './public-guide-types';

interface GuideTheme {
  id: string;
  slug: string;
  label: string;
  titlePrefix: string;
  eyebrow: string;
  problem: string;
  useCase: string;
  tips: string[];
}

interface GuideAudience {
  id: string;
  slug: string;
  label: string;
  context: string;
}

const guideThemes: Record<Locale, GuideTheme[]> = {
  es: [
    { id: 'consejos', slug: 'consejos', label: 'Consejos', titlePrefix: 'Consejos de viaje', eyebrow: 'Consejos de viaje', problem: 'las ideas, enlaces y decisiones se reparten entre demasiados sitios', useCase: 'convertir propuestas sueltas en un plan compartido', tips: ['Empieza por fechas, destino y alojamiento', 'Guarda ideas aunque todavía no tengan día', 'Añade ubicación a los planes importantes', 'Revisa checklist antes de cerrar el viaje'] },
    { id: 'trucos', slug: 'trucos', label: 'Trucos', titlePrefix: 'Trucos para planificar viajes', eyebrow: 'Trucos de organización', problem: 'el viaje crece rápido y cuesta saber qué está decidido', useCase: 'ordenar prioridades, alternativas y cambios de última hora', tips: ['Separa imprescindibles de ideas opcionales', 'No cierres horarios demasiado pronto', 'Agrupa planes por zona en el mapa', 'Deja huecos para descanso e improvisación'] },
    { id: 'checklist', slug: 'checklist', label: 'Checklist', titlePrefix: 'Checklist de viaje', eyebrow: 'Preparación', problem: 'las tareas pequeñas aparecen justo antes de salir', useCase: 'preparar documentación, reservas, equipaje y tareas pendientes', tips: ['Crea tareas por categorías', 'Marca lo preparado y lo pendiente', 'Añade responsables si viajáis en grupo', 'Revisa el primer y último día del viaje'] },
    { id: 'mapa', slug: 'mapa', label: 'Mapa', titlePrefix: 'Mapa de viaje', eyebrow: 'Mapas y rutas', problem: 'una lista de sitios no muestra distancias ni zonas', useCase: 'ver alojamiento, planes y puntos importantes en una vista común', tips: ['Usa el alojamiento como referencia', 'Detecta planes sin ubicación', 'Agrupa visitas cercanas', 'Guarda alternativas por barrio o zona'] },
    { id: 'calendario', slug: 'calendario', label: 'Calendario', titlePrefix: 'Calendario de viaje', eyebrow: 'Fechas y planes', problem: 'los días se cargan sin que nadie lo vea claro', useCase: 'repartir planes por día y mantener visibles los pendientes', tips: ['Coloca primero reservas y horarios fijos', 'Añade después planes cercanos', 'Mantén ideas sin fecha en una lista aparte', 'Equilibra días intensos y tranquilos'] },
    { id: 'itinerario', slug: 'itinerario', label: 'Itinerario', titlePrefix: 'Itinerario de viaje', eyebrow: 'Itinerarios', problem: 'una lista de planes no basta para saber qué hacer primero', useCase: 'transformar ideas en un recorrido consultable durante el viaje', tips: ['Ordena por día, hora y zona', 'Guarda notas breves en cada plan', 'Ten planes alternativos si cambia el tiempo', 'Comparte la versión actualizada con el grupo'] },
    { id: 'equipaje', slug: 'equipaje', label: 'Equipaje', titlePrefix: 'Lista de equipaje', eyebrow: 'Maleta y preparación', problem: 'la maleta se prepara con prisas y se olvidan objetos importantes', useCase: 'crear una lista de equipaje conectada con el tipo de viaje', tips: ['Divide ropa, tecnología, aseo y documentos', 'Marca cada cosa al meterla en la maleta', 'Añade objetos de última hora', 'Revisa la lista en el móvil antes de salir'] },
    { id: 'presupuesto', slug: 'presupuesto', label: 'Presupuesto', titlePrefix: 'Presupuesto de viaje', eyebrow: 'Costes y prioridades', problem: 'los gastos previstos quedan mezclados con decisiones y reservas', useCase: 'anotar referencias de coste y distinguir planes gratis, baratos o caros', tips: ['Distingue gastos fijos y opcionales', 'Guarda precios estimados cuando los tengas', 'Relaciona costes con planes concretos', 'Revisa prioridades antes de reservar'] },
    { id: 'planes', slug: 'planes', label: 'Planes', titlePrefix: 'Planes de viaje', eyebrow: 'Ideas y actividades', problem: 'las recomendaciones se duplican o desaparecen en conversaciones antiguas', useCase: 'guardar visitas, comidas, rutas y alternativas como planes vivos', tips: ['Crea planes aunque estén incompletos', 'Usa estados para propuestas y confirmados', 'Añade enlaces y ubicación cuando existan', 'No borres ideas útiles: déjalas como opcionales'] },
    { id: 'app', slug: 'app', label: 'App', titlePrefix: 'App para organizar viajes', eyebrow: 'Webapp de viajes', problem: 'usar muchas herramientas obliga a duplicar información', useCase: 'centralizar viajes, planes, mapa, calendario y preparación en una webapp', tips: ['Busca una herramienta cómoda en móvil', 'Prioriza mapa y calendario integrados', 'Comparte el viaje con permisos claros', 'Evita hojas o chats como única referencia'] },
  ],
  en: [
    { id: 'consejos', slug: 'tips', label: 'Tips', titlePrefix: 'Travel tips', eyebrow: 'Travel tips', problem: 'ideas, links and decisions end up spread across too many places', useCase: 'turn loose suggestions into a shared plan', tips: ['Start with dates, destination and accommodation', 'Save ideas even when they have no day yet', 'Add location to important plans', 'Review the checklist before closing the trip'] },
    { id: 'trucos', slug: 'tricks', label: 'Tricks', titlePrefix: 'Travel planning tricks', eyebrow: 'Planning tricks', problem: 'the trip grows quickly and it is hard to know what is decided', useCase: 'organize priorities, alternatives and last-minute changes', tips: ['Separate essentials from optional ideas', 'Do not close times too early', 'Group plans by area on the map', 'Leave room for breaks and improvisation'] },
    { id: 'checklist', slug: 'checklist', label: 'Checklist', titlePrefix: 'Travel checklist', eyebrow: 'Preparation', problem: 'small tasks appear right before leaving', useCase: 'prepare documents, bookings, luggage and pending tasks', tips: ['Create tasks by category', 'Mark what is ready and what is pending', 'Assign owners when traveling as a group', 'Review the first and last day of the trip'] },
    { id: 'mapa', slug: 'map', label: 'Map', titlePrefix: 'Trip map', eyebrow: 'Maps and routes', problem: 'a list of places does not show distances or areas', useCase: 'see accommodation, plans and important points in one shared view', tips: ['Use accommodation as a reference', 'Spot plans without location', 'Group nearby visits', 'Save alternatives by neighborhood or area'] },
    { id: 'calendario', slug: 'calendar', label: 'Calendar', titlePrefix: 'Trip calendar', eyebrow: 'Dates and plans', problem: 'days become overloaded without anyone noticing clearly', useCase: 'spread plans by day and keep pending ones visible', tips: ['Place bookings and fixed times first', 'Then add nearby plans', 'Keep unscheduled ideas in a separate list', 'Balance intense and relaxed days'] },
    { id: 'itinerario', slug: 'itinerary', label: 'Itinerary', titlePrefix: 'Travel itinerary', eyebrow: 'Itineraries', problem: 'a list of plans is not enough to know what to do first', useCase: 'turn ideas into a route that is easy to check during the trip', tips: ['Order by day, time and area', 'Save short notes in each plan', 'Keep alternatives if weather changes', 'Share the updated version with the group'] },
    { id: 'equipaje', slug: 'packing', label: 'Packing', titlePrefix: 'Packing list', eyebrow: 'Packing and preparation', problem: 'packing is rushed and important items get forgotten', useCase: 'create a packing list connected with the type of trip', tips: ['Split clothes, tech, toiletries and documents', 'Tick each item when packed', 'Add last-minute objects', 'Review the list on mobile before leaving'] },
    { id: 'presupuesto', slug: 'budget', label: 'Budget', titlePrefix: 'Trip budget', eyebrow: 'Costs and priorities', problem: 'expected costs get mixed with decisions and bookings', useCase: 'write cost references and separate free, cheap or expensive plans', tips: ['Separate fixed and optional costs', 'Save estimated prices when available', 'Connect costs with specific plans', 'Review priorities before booking'] },
    { id: 'planes', slug: 'plans', label: 'Plans', titlePrefix: 'Travel plans', eyebrow: 'Ideas and activities', problem: 'recommendations get duplicated or disappear in old conversations', useCase: 'save visits, meals, routes and alternatives as living plans', tips: ['Create plans even when incomplete', 'Use statuses for suggestions and confirmed items', 'Add links and location when available', 'Do not delete useful ideas: keep them optional'] },
    { id: 'app', slug: 'app', label: 'App', titlePrefix: 'Trip organization app', eyebrow: 'Travel web app', problem: 'using many tools forces you to duplicate information', useCase: 'centralize trips, plans, map, calendar and preparation in a web app', tips: ['Look for a tool that works well on mobile', 'Prioritize integrated map and calendar', 'Share the trip with clear permissions', 'Avoid spreadsheets or chats as the only reference'] },
  ],
};

const guideAudiences: Record<Locale, GuideAudience[]> = {
  es: [
    { id: 'viaje-grupo', slug: 'viaje-grupo', label: 'un viaje en grupo', context: 'cuando varias personas opinan, proponen planes y necesitan consultar la misma información' },
    { id: 'escapada-fin-semana', slug: 'escapada-fin-semana', label: 'una escapada de fin de semana', context: 'cuando hay pocos días y cada decisión tiene que ser rápida y práctica' },
    { id: 'viaje-familiar', slug: 'viaje-familiar', label: 'un viaje familiar', context: 'cuando hay ritmos distintos, más equipaje y muchos detalles que preparar' },
    { id: 'viaje-amigos', slug: 'viaje-amigos', label: 'un viaje con amigos', context: 'cuando las ideas nacen en chats y hace falta convertirlas en un plan común' },
    { id: 'viaje-urbano', slug: 'viaje-urbano', label: 'un viaje urbano', context: 'cuando el mapa, los barrios y las distancias marcan la diferencia' },
  ],
  en: [
    { id: 'viaje-grupo', slug: 'group-trip', label: 'a group trip', context: 'when several people give opinions, suggest plans and need to check the same information' },
    { id: 'escapada-fin-semana', slug: 'weekend-getaway', label: 'a weekend getaway', context: 'when there are few days and every decision needs to be fast and practical' },
    { id: 'viaje-familiar', slug: 'family-trip', label: 'a family trip', context: 'when there are different rhythms, more luggage and many details to prepare' },
    { id: 'viaje-amigos', slug: 'friends-trip', label: 'a trip with friends', context: 'when ideas begin in chats and need to become a shared plan' },
    { id: 'viaje-urbano', slug: 'city-trip', label: 'a city trip', context: 'when the map, neighborhoods and distances make the difference' },
  ],
};

function buildTopics(locale: Locale): PublicGuideTopic[] {
  return guideThemes[locale].flatMap((theme) =>
    guideAudiences[locale].map((audience) => ({
      id: `${theme.id}-${audience.id}`,
      slug: `${theme.slug}-${audience.slug}`,
      label: `${theme.label} para ${audience.label}`,
      eyebrow: theme.eyebrow,
      title: locale === 'es' ? `${theme.titlePrefix} para ${audience.label}` : `${theme.titlePrefix} for ${audience.label}`,
      description: locale === 'es'
        ? `${theme.titlePrefix} para ${audience.label}: consejos, trucos y recomendaciones para vender TravelPlan como organizador de viajes compartidos.`
        : `${theme.titlePrefix} for ${audience.label}: tips, tricks and recommendations that show TravelPlan as a shared trip organizer.`,
      problem: `${theme.problem}; ${audience.context}`,
      useCase: theme.useCase,
      tips: [...theme.tips],
    })),
  );
}

export type PublicSeoGuidePageId = string;

function getRelatedIds(ids: string[], index: number): string[] {
  return [
    ids[(index + 1) % ids.length],
    ids[(index + 5) % ids.length],
    ids[(index + 17) % ids.length],
    ids[(index + 31) % ids.length],
  ].filter(Boolean);
}

function buildGuidePages(locale: Locale): Record<PublicSeoGuidePageId, PublicPageContent<PublicSeoGuidePageId>> {
  const topics = buildTopics(locale);
  const ids = topics.map((topic) => topic.id);

  return Object.fromEntries(
    topics.map((topic, index) => [
      topic.id,
      locale === 'es'
        ? {
            id: topic.id,
            label: topic.label,
            slug: topic.slug,
            eyebrow: topic.eyebrow,
            title: topic.title,
            description: topic.description,
            intro: `Una guía práctica sobre ${topic.label} para convertir ideas sueltas en un viaje más claro, compartido y fácil de consultar desde TravelPlan.`,
            relatedIds: getRelatedIds(ids, index),
            sections: [
              { title: 'Por qué conviene organizarlo antes', body: `Cuando ${topic.problem}, el viaje puede empezar con dudas, cambios de última hora y datos repartidos. Prepararlo en una webapp evita que las decisiones importantes dependan de recordar el mensaje correcto.` },
              { title: 'Consejos prácticos para empezar', body: `Para ${topic.useCase}, lo mejor es separar lo que ya está decidido de las ideas que aún pueden moverse. Así el itinerario crece sin volverse rígido.`, items: topic.tips },
              { title: 'Trucos para decidir mejor', body: 'Empieza por los planes fijos y después coloca alternativas alrededor. Si una idea no tiene fecha, mantenla visible como pendiente en vez de borrarla: muchas veces termina encajando en un hueco libre.' },
              { title: 'Cómo ayuda TravelPlan', body: 'TravelPlan reúne viajes, planes, alojamiento, mapa, calendario, checklist y equipaje en un mismo sitio. Es especialmente útil cuando varias personas opinan, porque todos ven la misma versión actualizada.', items: ['Planes con estado, fecha y ubicación.', 'Mapa para entender zonas y distancias.', 'Checklist y equipaje para preparar la salida.', 'Colaboración para que el viaje no dependa de una sola persona.'] },
              { title: 'Recomendación final', body: 'No intentes cerrar todo desde el primer día. Crea el viaje, guarda ideas, añade ubicación cuando la conozcas y usa el calendario solo cuando una actividad esté lo bastante clara.' },
            ],
          }
        : {
            id: topic.id,
            label: topic.label,
            slug: topic.slug,
            eyebrow: topic.eyebrow,
            title: topic.title,
            description: topic.description,
            intro: `A practical guide about ${topic.label} to turn loose ideas into a clearer, shared trip that is easy to check from TravelPlan.`,
            relatedIds: getRelatedIds(ids, index),
            sections: [
              { title: 'Why it helps to plan it first', body: `When ${topic.problem}, the trip can start with doubts, last-minute changes and scattered details. Preparing it in a web app avoids depending on the right message being remembered.` },
              { title: 'Practical tips to start', body: `For ${topic.useCase}, it is better to separate what is already decided from ideas that can still move. The itinerary can grow without becoming rigid.`, items: topic.tips },
              { title: 'Tricks to decide better', body: 'Start with fixed plans and then place alternatives around them. If an idea has no date yet, keep it visible as pending instead of deleting it: it may fit later in a free slot.' },
              { title: 'How TravelPlan helps', body: 'TravelPlan brings trips, plans, accommodation, map, calendar, checklist and luggage together in one place. It is especially useful when several people give opinions, because everyone sees the same updated version.', items: ['Plans with status, date and location.', 'Map to understand areas and distances.', 'Checklist and luggage to prepare departure.', 'Collaboration so the trip does not depend on one person.'] },
              { title: 'Final recommendation', body: 'Do not try to close everything on day one. Create the trip, save ideas, add location when you know it and use the calendar only when an activity is clear enough.' },
            ],
          },
    ]),
  ) as Record<PublicSeoGuidePageId, PublicPageContent<PublicSeoGuidePageId>>;
}

export const publicSeoGuidePageIds = buildTopics('es').map((topic) => topic.id);

export const publicSeoGuidePages = {
  es: buildGuidePages('es'),
  en: buildGuidePages('en'),
} satisfies Record<Locale, Record<PublicSeoGuidePageId, PublicPageContent<PublicSeoGuidePageId>>>;
