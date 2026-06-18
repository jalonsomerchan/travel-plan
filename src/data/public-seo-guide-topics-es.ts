import type { PublicGuideTopic } from './public-guide-types';

export const publicSeoGuideTopicsEs = [
  {
    id: 'consejos-viaje-grupo',
    slug: 'consejos-viaje-grupo',
    label: 'Consejos para viajes en grupo',
    eyebrow: 'Viajes en grupo',
    title: 'Consejos para organizar viajes en grupo sin caos',
    description: 'Consejos para organizar viajes en grupo sin caos. Consejos, trucos y recomendaciones para organizar mejor el viaje con mapas, calendario, checklist y colaboración.',
    problem: 'varias personas proponen planes, reservas y horarios a la vez',
    useCase: 'centralizar ideas, calendario, mapa y tareas compartidas',
    tips: ['Define fechas y destino antes de discutir detalles', 'Guarda propuestas como planes pendientes', 'Revisa el mapa para agrupar zonas', 'Separa tareas de preparación del itinerario'],
  },
] as const satisfies readonly PublicGuideTopic[];
