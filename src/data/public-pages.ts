import type { Locale } from '../config/site';

export const publicPageIds = [
  'about',
  'privacy',
  'faq',
  'features',
  'how-it-works',
  'manual',
] as const;

export type PublicPageId = (typeof publicPageIds)[number];

interface PublicPageSection {
  title: string;
  body: string;
  items?: string[];
}

export interface PublicPageContent {
  id: PublicPageId;
  label: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: PublicPageSection[];
}

export const publicPages: Record<Locale, Record<PublicPageId, PublicPageContent>> = {
  es: {
    about: {
      id: 'about',
      label: 'Acerca de',
      slug: 'acerca-de',
      eyebrow: 'Sobre TravelPlan',
      title: 'Acerca de TravelPlan',
      description: 'Conoce qué es TravelPlan, para quién está pensado y cómo ayuda a organizar viajes compartidos.',
      intro:
        'TravelPlan es una webapp ligera para preparar viajes con una visión común: fechas, planes, mapas, alojamiento, checklist y colaboración en tiempo real.',
      sections: [
        {
          title: 'Una base compartida para cada viaje',
          body: 'La app centraliza la información que normalmente acaba repartida entre chats, notas, reservas y mapas. Cada viaje tiene su espacio propio para que todo el grupo pueda revisar el itinerario sin perder contexto.',
        },
        {
          title: 'Diseñada para grupos pequeños',
          body: 'Está pensada para escapadas con amigos, viajes familiares o rutas en pareja donde varias personas necesitan consultar o editar planes sin montar una herramienta compleja.',
        },
        {
          title: 'Privacidad y sencillez',
          body: 'El acceso se realiza con Google y los viajes se guardan en Firebase. La prioridad es mantener una experiencia clara, rápida y fácil de usar desde móvil.',
        },
      ],
    },
    privacy: {
      id: 'privacy',
      label: 'Privacidad',
      slug: 'privacidad',
      eyebrow: 'Datos y seguridad',
      title: 'Privacidad',
      description: 'Información clara sobre los datos que usa TravelPlan para guardar viajes, miembros, planes y preferencias.',
      intro:
        'TravelPlan utiliza los datos mínimos necesarios para iniciar sesión, guardar viajes y permitir la colaboración entre personas invitadas.',
      sections: [
        {
          title: 'Datos que se guardan',
          body: 'Se pueden guardar datos de cuenta, viajes, fechas, ubicaciones, planes, alojamiento, checklist, equipaje e invitaciones. Estos datos se usan para mostrar y sincronizar la experiencia dentro de la app.',
          items: ['Cuenta de Google usada para acceder.', 'Información de viajes y planes creada por el usuario.', 'Permisos e invitaciones asociados a cada viaje.'],
        },
        {
          title: 'Uso de Firebase',
          body: 'La autenticación y la base de datos se apoyan en Firebase. Las reglas de acceso limitan la lectura y escritura a personas autorizadas en cada viaje.',
        },
        {
          title: 'Control del usuario',
          body: 'Cada usuario decide qué viajes crea, qué información añade y a quién invita. Si no quieres compartir un dato concreto, puedes dejarlo sin configurar o eliminarlo desde la app cuando esté disponible esa acción.',
        },
      ],
    },
    faq: {
      id: 'faq',
      label: 'Preguntas frecuentes',
      slug: 'preguntas-frecuentes',
      eyebrow: 'Ayuda rápida',
      title: 'Preguntas frecuentes',
      description: 'Respuestas a dudas habituales sobre viajes, planes, invitaciones, mapas, alojamiento y uso de TravelPlan.',
      intro:
        'Estas respuestas resumen el funcionamiento básico de TravelPlan para empezar a organizar un viaje sin perder tiempo.',
      sections: [
        {
          title: '¿Necesito crear una cuenta?',
          body: 'Sí. Para guardar viajes y sincronizarlos entre dispositivos debes iniciar sesión con Google.',
        },
        {
          title: '¿Puedo invitar a otras personas?',
          body: 'Sí. Puedes invitar a otras personas por correo y asignarles permisos para ver o editar el viaje.',
        },
        {
          title: '¿Los planes necesitan fecha y ubicación?',
          body: 'No. Puedes crear planes pendientes sin fecha o sin ubicación y completarlos más adelante.',
        },
        {
          title: '¿Funciona en móvil?',
          body: 'Sí. La interfaz está pensada para usarse desde móvil, tablet y escritorio.',
        },
      ],
    },
    features: {
      id: 'features',
      label: 'Funciones principales',
      slug: 'funciones-principales',
      eyebrow: 'Qué puedes hacer',
      title: 'Funciones principales',
      description: 'Resumen de las principales funciones de TravelPlan para organizar viajes colaborativos con mapas y calendario.',
      intro:
        'TravelPlan reúne las piezas esenciales de un viaje para que el grupo pueda organizarse desde una sola pantalla.',
      sections: [
        {
          title: 'Viajes compartidos',
          body: 'Crea viajes con nombre, fechas, destino, estado, personas invitadas y permisos de colaboración.',
        },
        {
          title: 'Planes con contexto',
          body: 'Añade visitas, comidas, transportes, museos, tiendas o ideas sueltas con fecha, hora, descripción, estado, ubicación y enlaces asociados.',
        },
        {
          title: 'Mapas y alojamiento',
          body: 'Guarda la ubicación del alojamiento, consulta planes en mapa y revisa distancias cuando hay coordenadas disponibles.',
        },
        {
          title: 'Checklist y equipaje',
          body: 'Prepara tareas y elementos importantes para no olvidar pasos antes del viaje.',
        },
      ],
    },
    'how-it-works': {
      id: 'how-it-works',
      label: 'Cómo funciona',
      slug: 'como-funciona',
      eyebrow: 'Proceso básico',
      title: 'Cómo funciona',
      description: 'Guía sencilla sobre el flujo de uso de TravelPlan: iniciar sesión, crear un viaje, añadir planes e invitar personas.',
      intro:
        'El flujo está pensado para empezar rápido: creas un viaje, añades planes y completas detalles según se acerca la fecha.',
      sections: [
        {
          title: '1. Inicia sesión',
          body: 'Accede con Google para que tus viajes queden guardados y puedas recuperarlos en otros dispositivos.',
        },
        {
          title: '2. Crea un viaje',
          body: 'Define nombre, destino, fechas y estado general. Después puedes editar la información cuando cambien los planes.',
        },
        {
          title: '3. Añade planes',
          body: 'Crea actividades, comidas, visitas o transportes. Puedes añadir ubicación, enlaces, fecha, hora y descripción.',
        },
        {
          title: '4. Comparte y revisa',
          body: 'Invita a otras personas, consulta calendario y mapa, y usa checklist o equipaje para preparar los últimos detalles.',
        },
      ],
    },
    manual: {
      id: 'manual',
      label: 'Manual',
      slug: 'manual',
      eyebrow: 'Guía de uso',
      title: 'Manual de TravelPlan',
      description: 'Manual práctico para aprender a usar TravelPlan y aprovechar viajes, planes, calendario, mapas e invitaciones.',
      intro:
        'Este manual resume las acciones más habituales dentro de la app para que puedas organizar un viaje completo paso a paso.',
      sections: [
        {
          title: 'Crear y editar viajes',
          body: 'Desde el dashboard puedes crear un viaje nuevo. En la ficha del viaje puedes modificar datos generales, abrir el calendario, revisar el mapa o gestionar personas invitadas.',
        },
        {
          title: 'Gestionar planes',
          body: 'Cada plan puede incluir categoría, estado, descripción, fecha, hora, ubicación y enlaces. Los planes sin fecha siguen apareciendo como pendientes de concretar.',
        },
        {
          title: 'Usar mapas y calendario',
          body: 'El mapa ayuda a ver la distribución de planes con ubicación. El calendario agrupa actividades por fecha y mantiene visibles los planes sin programar.',
        },
        {
          title: 'Preparar el viaje',
          body: 'Usa checklist, equipaje y alojamiento para completar los detalles prácticos antes de salir.',
        },
      ],
    },
  },
  en: {
    about: {
      id: 'about',
      label: 'About',
      slug: 'about',
      eyebrow: 'About TravelPlan',
      title: 'About TravelPlan',
      description: 'Learn what TravelPlan is, who it is for and how it helps organize shared trips.',
      intro:
        'TravelPlan is a lightweight web app for preparing trips with a shared view: dates, plans, maps, accommodation, checklist and real-time collaboration.',
      sections: [
        {
          title: 'One shared base for every trip',
          body: 'The app centralizes information that usually ends up split between chats, notes, bookings and maps. Each trip has its own space so the group can review the itinerary without losing context.',
        },
        {
          title: 'Designed for small groups',
          body: 'It is built for getaways with friends, family trips or couple routes where several people need to check or edit plans without using a complex tool.',
        },
        {
          title: 'Privacy and simplicity',
          body: 'Access uses Google sign-in and trips are stored in Firebase. The priority is a clear, fast experience that works well from mobile.',
        },
      ],
    },
    privacy: {
      id: 'privacy',
      label: 'Privacy',
      slug: 'privacy',
      eyebrow: 'Data and security',
      title: 'Privacy',
      description: 'Clear information about the data TravelPlan uses to save trips, members, plans and preferences.',
      intro:
        'TravelPlan uses the minimum data needed to sign in, save trips and enable collaboration between invited people.',
      sections: [
        {
          title: 'Data that can be saved',
          body: 'Account data, trips, dates, locations, plans, accommodation, checklist, luggage and invitations can be saved. This data is used to display and synchronize the app experience.',
          items: ['Google account used to sign in.', 'Trip and plan information created by the user.', 'Permissions and invitations linked to each trip.'],
        },
        {
          title: 'Firebase usage',
          body: 'Authentication and database features rely on Firebase. Access rules limit reading and writing to authorized people on each trip.',
        },
        {
          title: 'User control',
          body: 'Each user decides which trips to create, what information to add and who to invite. If you do not want to share a specific detail, you can leave it empty or remove it from the app when that action is available.',
        },
      ],
    },
    faq: {
      id: 'faq',
      label: 'FAQ',
      slug: 'faq',
      eyebrow: 'Quick help',
      title: 'Frequently asked questions',
      description: 'Answers to common questions about trips, plans, invitations, maps, accommodation and TravelPlan usage.',
      intro:
        'These answers summarize the basics of TravelPlan so you can start organizing a trip quickly.',
      sections: [
        {
          title: 'Do I need an account?',
          body: 'Yes. To save trips and synchronize them across devices you need to sign in with Google.',
        },
        {
          title: 'Can I invite other people?',
          body: 'Yes. You can invite people by email and give them permission to view or edit the trip.',
        },
        {
          title: 'Do plans need a date and location?',
          body: 'No. You can create pending plans without a date or location and complete them later.',
        },
        {
          title: 'Does it work on mobile?',
          body: 'Yes. The interface is designed for mobile, tablet and desktop use.',
        },
      ],
    },
    features: {
      id: 'features',
      label: 'Main features',
      slug: 'main-features',
      eyebrow: 'What you can do',
      title: 'Main features',
      description: 'Overview of the main TravelPlan features for organizing collaborative trips with maps and calendar.',
      intro:
        'TravelPlan brings the essential pieces of a trip together so the group can stay organized from one place.',
      sections: [
        {
          title: 'Shared trips',
          body: 'Create trips with a name, dates, destination, status, invited people and collaboration permissions.',
        },
        {
          title: 'Plans with context',
          body: 'Add visits, meals, transport, museums, shops or loose ideas with date, time, description, status, location and related links.',
        },
        {
          title: 'Maps and accommodation',
          body: 'Save accommodation location, check plans on a map and review distances when coordinates are available.',
        },
        {
          title: 'Checklist and luggage',
          body: 'Prepare tasks and important items so you do not forget key steps before the trip.',
        },
      ],
    },
    'how-it-works': {
      id: 'how-it-works',
      label: 'How it works',
      slug: 'how-it-works',
      eyebrow: 'Basic flow',
      title: 'How it works',
      description: 'Simple guide to TravelPlan usage: sign in, create a trip, add plans and invite people.',
      intro:
        'The flow is designed to start quickly: create a trip, add plans and complete details as the date approaches.',
      sections: [
        {
          title: '1. Sign in',
          body: 'Use Google sign-in so your trips are saved and can be recovered on other devices.',
        },
        {
          title: '2. Create a trip',
          body: 'Set name, destination, dates and general status. You can edit the information later when plans change.',
        },
        {
          title: '3. Add plans',
          body: 'Create activities, meals, visits or transport items. You can add location, links, date, time and description.',
        },
        {
          title: '4. Share and review',
          body: 'Invite other people, check calendar and map, and use checklist or luggage to prepare the final details.',
        },
      ],
    },
    manual: {
      id: 'manual',
      label: 'Manual',
      slug: 'manual',
      eyebrow: 'User guide',
      title: 'TravelPlan manual',
      description: 'Practical manual to learn how to use TravelPlan and make the most of trips, plans, calendar, maps and invitations.',
      intro:
        'This manual summarizes the most common actions in the app so you can organize a complete trip step by step.',
      sections: [
        {
          title: 'Create and edit trips',
          body: 'From the dashboard you can create a new trip. In the trip detail you can update general data, open the calendar, review the map or manage invited people.',
        },
        {
          title: 'Manage plans',
          body: 'Each plan can include category, status, description, date, time, location and links. Plans without a date remain visible as still unscheduled.',
        },
        {
          title: 'Use maps and calendar',
          body: 'The map helps you see the distribution of plans with location. The calendar groups activities by date and keeps unscheduled plans visible.',
        },
        {
          title: 'Prepare the trip',
          body: 'Use checklist, luggage and accommodation to complete practical details before leaving.',
        },
      ],
    },
  },
};

export function getPublicPage(locale: Locale, id: PublicPageId) {
  return publicPages[locale][id];
}

export function getPublicPages(locale: Locale) {
  return publicPageIds.map((id) => publicPages[locale][id]);
}

export function getPublicPagePath(locale: Locale, id: PublicPageId) {
  return `/${publicPages[locale][id].slug}/`;
}
