import type { PublicPageContent } from './public-page-types';
import type { PublicSeoPageId } from './public-seo-pages';

export const publicSeoPagesEs: Record<PublicSeoPageId, PublicPageContent<PublicSeoPageId>> = {
  'organizador-viajes-grupo': {
    id: 'organizador-viajes-grupo',
    label: 'Organizador de viajes en grupo',
    slug: 'organizador-viajes-grupo',
    eyebrow: 'Viajes con varias personas',
    title: 'Organizador de viajes en grupo online',
    description: 'Organiza viajes en grupo con planes compartidos, mapas, calendario, alojamiento, checklist y permisos de edición desde una sola webapp.',
    intro: 'TravelPlan ayuda a preparar un viaje en grupo sin perder información entre WhatsApp, hojas sueltas, mapas guardados y notas personales.',
    sections: [
      {
        title: 'Una webapp para coordinar a todo el grupo',
        body: 'Cada viaje puede reunir destino, fechas, alojamiento, planes, puntos de interés y tareas pendientes. Así todas las personas consultan la misma información actualizada.',
        items: ['Viajes compartidos con permisos.', 'Planes con estado, fecha y ubicación.', 'Mapa y calendario conectados con el itinerario.'],
      },
      {
        title: 'Menos caos en chats y hojas de cálculo',
        body: 'Cuando cada persona propone restaurantes, visitas o excursiones en sitios distintos, decidir se vuelve lento. TravelPlan centraliza esas ideas para revisarlas por día, estado o lugar.',
      },
      {
        title: 'Preparado para escapadas reales',
        body: 'Puedes guardar planes sin fecha, moverlos más adelante, marcar alojamiento y usar checklist o equipaje para preparar los detalles antes de salir.',
      },
    ],
  },
  'planificador-itinerarios': {
    id: 'planificador-itinerarios',
    label: 'Planificador de itinerarios',
    slug: 'planificador-itinerarios',
    eyebrow: 'Itinerarios claros',
    title: 'Planificador de itinerarios de viaje con calendario y mapa',
    description: 'Crea itinerarios de viaje por días con planes, horarios, ubicaciones, mapas y colaboración para organizar mejor cada escapada.',
    intro: 'Un buen itinerario no es solo una lista de sitios: también necesita fechas, orden, contexto, ubicación y margen para cambios.',
    sections: [
      {
        title: 'Organiza planes por fecha y estado',
        body: 'TravelPlan permite guardar ideas pendientes, planes propuestos y actividades ya decididas para construir el itinerario poco a poco.',
        items: ['Listado de planes del viaje.', 'Calendario para revisar fechas.', 'Estados para distinguir ideas de planes confirmados.'],
      },
      {
        title: 'Combina mapa y agenda',
        body: 'Los planes con ubicación se pueden consultar en el mapa para entender mejor qué zonas conviene agrupar y qué visitas quedan lejos.',
      },
      {
        title: 'Flexible hasta el último momento',
        body: 'Si cambia el tiempo, el horario o las preferencias del grupo, puedes mover planes y mantener una visión actualizada del viaje.',
      },
    ],
  },
  'app-mapas-viaje': {
    id: 'app-mapas-viaje',
    label: 'Mapas para viajes',
    slug: 'app-mapas-viaje',
    eyebrow: 'Mapas e itinerarios',
    title: 'App de mapas para organizar planes de viaje',
    description: 'Guarda planes con ubicación y revisa el viaje en un mapa compartido con alojamiento, puntos de interés y actividades del itinerario.',
    intro: 'El mapa de un viaje sirve para mucho más que ver chinchetas: ayuda a decidir zonas, evitar desplazamientos absurdos y encontrar planes cercanos.',
    sections: [
      {
        title: 'Todos los puntos importantes juntos',
        body: 'TravelPlan puede mostrar alojamiento, planes y puntos de interés del viaje en una vista de mapa pensada para consultar durante la planificación.',
        items: ['Alojamiento como referencia.', 'Planes con marcador y detalle.', 'Puntos de interés guardados para el viaje.'],
      },
      {
        title: 'Filtros para no saturar el mapa',
        body: 'Cuando hay muchos planes, los filtros ayudan a decidir qué capas ver y a centrarse en lo que importa en cada momento.',
      },
      {
        title: 'Ideal para rutas urbanas',
        body: 'En ciudades con muchas visitas, restaurantes y miradores, ver todo sobre el mapa facilita agrupar zonas y preparar días más cómodos.',
      },
    ],
  },
  'checklist-equipaje-viaje': {
    id: 'checklist-equipaje-viaje',
    label: 'Checklist y equipaje',
    slug: 'checklist-equipaje-viaje',
    eyebrow: 'Preparación del viaje',
    title: 'Checklist de viaje y lista de equipaje compartida',
    description: 'Prepara tu viaje con checklist, tareas pendientes y lista de equipaje para no olvidar documentos, reservas ni objetos importantes.',
    intro: 'Antes de viajar siempre aparecen pequeñas tareas: revisar documentos, preparar maleta, confirmar horarios, guardar enlaces o recordar detalles del alojamiento.',
    sections: [
      {
        title: 'Checklist por viaje',
        body: 'Cada viaje puede tener su propia lista de tareas para repartir la preparación y revisar qué falta antes de salir.',
        items: ['Tareas pendientes y completadas.', 'Notas prácticas por viaje.', 'Preparación visible para el grupo.'],
      },
      {
        title: 'Equipaje separado de los planes',
        body: 'La lista de equipaje evita mezclar objetos personales con visitas o reservas, manteniendo cada cosa en su sitio.',
      },
      {
        title: 'Más tranquilidad antes de salir',
        body: 'Una preparación clara reduce olvidos y ayuda a llegar al primer día del viaje con menos prisas.',
      },
    ],
  },
  'calendario-viaje-compartido': {
    id: 'calendario-viaje-compartido',
    label: 'Calendario de viaje compartido',
    slug: 'calendario-viaje-compartido',
    eyebrow: 'Fechas y planes',
    title: 'Calendario de viaje compartido para organizar planes',
    description: 'Visualiza los planes de un viaje en calendario, reparte actividades por día y comparte el itinerario con otras personas.',
    intro: 'Un calendario de viaje compartido ayuda a comprobar si un día está demasiado cargado, si quedan huecos o si faltan planes por asignar.',
    sections: [
      {
        title: 'Planes agrupados por día',
        body: 'TravelPlan permite revisar fechas y actividades desde una vista clara para que el grupo entienda qué toca en cada jornada.',
        items: ['Planes con fecha.', 'Actividades pendientes sin día cerrado.', 'Acceso rápido al detalle del plan.'],
      },
      {
        title: 'Útil antes y durante el viaje',
        body: 'Antes de salir sirve para ordenar el itinerario; durante el viaje ayuda a consultar lo siguiente sin buscar en conversaciones antiguas.',
      },
      {
        title: 'Conectado con mapas y checklist',
        body: 'El calendario no vive aislado: se complementa con ubicación, alojamiento, puntos de interés y preparación del viaje.',
      },
    ],
  },
  'planificar-escapada-fin-semana': {
    id: 'planificar-escapada-fin-semana',
    label: 'Escapadas de fin de semana',
    slug: 'planificar-escapada-fin-semana',
    eyebrow: 'Escapadas cortas',
    title: 'Cómo planificar una escapada de fin de semana',
    description: 'Organiza una escapada de fin de semana con planes por día, alojamiento, mapa, checklist y colaboración con acompañantes.',
    intro: 'Las escapadas cortas necesitan planificación ligera: pocos días, decisiones rápidas y una forma sencilla de no olvidar reservas ni sitios importantes.',
    sections: [
      {
        title: 'Empieza por fechas y alojamiento',
        body: 'Crear el viaje con destino, fechas y alojamiento permite usar el resto de secciones como una base común para la escapada.',
      },
      {
        title: 'Guarda ideas sin cerrarlas demasiado pronto',
        body: 'Puedes añadir restaurantes, miradores, visitas o paseos como planes pendientes y decidir después qué encaja mejor en cada día.',
        items: ['Ideas rápidas.', 'Planes con ubicación.', 'Checklist para preparar la salida.'],
      },
      {
        title: 'Comparte el plan con quien viaja contigo',
        body: 'En una escapada con pareja, amigos o familia, todas las personas pueden consultar el itinerario actualizado sin depender de capturas antiguas.',
      },
    ],
  },
  'organizar-viaje-amigos': {
    id: 'organizar-viaje-amigos',
    label: 'Viajes con amigos',
    slug: 'organizar-viaje-amigos',
    eyebrow: 'Planes con amigos',
    title: 'Cómo organizar un viaje con amigos sin caos',
    description: 'Centraliza propuestas, mapas, calendario, alojamiento y checklist para organizar un viaje con amigos desde una webapp colaborativa.',
    intro: 'Un viaje con amigos suele empezar con muchas ideas y acabar con información repartida. TravelPlan ayuda a convertir esas propuestas en un itinerario compartido.',
    sections: [
      {
        title: 'Un lugar para todas las propuestas',
        body: 'Cada persona puede aportar ideas de planes, restaurantes o visitas, y el grupo puede revisarlas dentro del mismo viaje.',
      },
      {
        title: 'Decisiones más visibles',
        body: 'Los estados de plan ayudan a distinguir lo propuesto, lo pendiente y lo ya realizado, evitando confusiones cuando el viaje crece.',
        items: ['Propuestas del grupo.', 'Planes pendientes.', 'Actividades realizadas.'],
      },
      {
        title: 'Información práctica siempre accesible',
        body: 'Alojamiento, mapas, enlaces, checklist y equipaje quedan junto al itinerario para que no haya que buscar cada dato en un chat distinto.',
      },
    ],
  },
  'viaje-colaborativo-online': {
    id: 'viaje-colaborativo-online',
    label: 'Viaje colaborativo online',
    slug: 'viaje-colaborativo-online',
    eyebrow: 'Colaboración online',
    title: 'Planificación colaborativa de viajes online',
    description: 'Planifica viajes online de forma colaborativa con miembros, permisos, planes compartidos, calendario, mapa y tareas de preparación.',
    intro: 'La planificación colaborativa permite que el viaje deje de depender de una sola persona y se convierta en un espacio común para todo el grupo.',
    sections: [
      {
        title: 'Roles y permisos para colaborar',
        body: 'TravelPlan está pensado para que varias personas puedan consultar o editar la información del viaje según los permisos definidos.',
      },
      {
        title: 'Una base viva para el itinerario',
        body: 'El viaje se puede actualizar cuando cambian fechas, planes, ubicaciones o decisiones del grupo, manteniendo una referencia única.',
        items: ['Viajes compartidos.', 'Edición colaborativa.', 'Información sincronizada.'],
      },
      {
        title: 'De la idea al viaje preparado',
        body: 'Puedes empezar con una lista de ideas y acabar con calendario, mapa, alojamiento, checklist y equipaje listos para viajar.',
      },
    ],
  },
};
