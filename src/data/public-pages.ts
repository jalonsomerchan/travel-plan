import type { Locale } from '../config/site';
import { publicSeoPageIds, publicSeoPages, type PublicSeoPageId } from './public-seo-pages';
import type { PublicPageContent, PublicPageSection } from './public-page-types';

const publicBasePageIds = [
  'about',
  'privacy',
  'faq',
  'features',
  'how-it-works',
  'manual',
] as const;

export const publicPageIds = [
  ...publicBasePageIds,
  ...publicSeoPageIds,
] as const;

type PublicBasePageId = (typeof publicBasePageIds)[number];
export type PublicPageId = PublicBasePageId | PublicSeoPageId;

export type { PublicPageContent, PublicPageSection };

const basePagesEs: Record<PublicBasePageId, PublicPageContent<PublicBasePageId>> = {
  about: {
    id: 'about',
    label: 'Acerca de',
    slug: 'acerca-de',
    eyebrow: 'Sobre TravelPlan',
    title: 'Acerca de TravelPlan',
    description: 'Conoce qué es TravelPlan y cómo ayuda a organizar viajes compartidos.',
    intro: 'TravelPlan es una webapp ligera para preparar viajes con fechas, planes, mapas, alojamiento, checklist y colaboración.',
    sections: [
      { title: 'Una base compartida', body: 'Cada viaje reúne información que normalmente queda dispersa entre chats, notas, reservas y mapas.' },
      { title: 'Pensado para grupos pequeños', body: 'Sirve para escapadas con amigos, viajes familiares o rutas en pareja donde varias personas necesitan consultar o editar planes.' },
    ],
  },
  privacy: {
    id: 'privacy',
    label: 'Privacidad',
    slug: 'privacidad',
    eyebrow: 'Datos y seguridad',
    title: 'Privacidad',
    description: 'Información sobre los datos que usa TravelPlan para guardar viajes, miembros y planes.',
    intro: 'TravelPlan utiliza los datos mínimos necesarios para iniciar sesión, guardar viajes y permitir colaboración entre personas invitadas.',
    sections: [
      { title: 'Datos que se guardan', body: 'Se pueden guardar datos de cuenta, viajes, fechas, ubicaciones, planes, alojamiento, checklist, equipaje e invitaciones.', items: ['Cuenta de Google usada para acceder.', 'Información creada por el usuario.', 'Permisos e invitaciones asociados a cada viaje.'] },
      { title: 'Control del usuario', body: 'Cada usuario decide qué viajes crea, qué información añade y a quién invita. Los datos sensibles deben evitarse si no son necesarios para organizar el viaje.' },
    ],
  },
  faq: {
    id: 'faq',
    label: 'Preguntas frecuentes',
    slug: 'preguntas-frecuentes',
    eyebrow: 'Ayuda rápida',
    title: 'Preguntas frecuentes',
    description: 'Dudas habituales sobre viajes, planes, invitaciones, mapas y uso de TravelPlan.',
    intro: 'Estas respuestas resumen el funcionamiento básico de TravelPlan para empezar a organizar un viaje sin perder tiempo.',
    sections: [
      { title: '¿Necesito crear una cuenta?', body: 'Sí. Para guardar viajes y sincronizarlos entre dispositivos debes iniciar sesión con Google.' },
      { title: '¿Los planes necesitan fecha y ubicación?', body: 'No. Puedes crear planes pendientes sin fecha o sin ubicación y completarlos más adelante.' },
      { title: '¿Puedo invitar a otras personas?', body: 'Sí. Puedes invitar por correo y asignar permisos para ver o editar el viaje.' },
    ],
  },
  features: {
    id: 'features',
    label: 'Funciones principales',
    slug: 'funciones-principales',
    eyebrow: 'Qué puedes hacer',
    title: 'Funciones principales',
    description: 'Resumen de las funciones de TravelPlan para organizar viajes colaborativos con mapas y calendario.',
    intro: 'TravelPlan reúne las piezas esenciales de un viaje para que el grupo pueda organizarse desde una sola pantalla.',
    sections: [
      { title: 'Viajes y planes', body: 'Crea viajes con fechas, destino y miembros. Añade visitas, comidas, transportes o ideas con estado, fecha, ubicación y enlaces.' },
      { title: 'Mapas, calendario y preparación', body: 'Consulta planes en mapa, revisa el calendario, guarda alojamiento y prepara checklist o equipaje antes de salir.' },
    ],
  },
  'how-it-works': {
    id: 'how-it-works',
    label: 'Cómo funciona',
    slug: 'como-funciona',
    eyebrow: 'Proceso básico',
    title: 'Cómo funciona',
    description: 'Guía sencilla sobre el flujo de uso: iniciar sesión, crear un viaje, añadir planes e invitar personas.',
    intro: 'El flujo está pensado para empezar rápido y completar detalles según se acerca la fecha del viaje.',
    sections: [
      { title: '1. Crea el viaje', body: 'Inicia sesión, define nombre, destino, fechas y estado general del viaje.' },
      { title: '2. Añade y comparte planes', body: 'Crea actividades, completa ubicación y enlaces, invita a otras personas y revisa mapa, calendario y checklist.' },
    ],
  },
  manual: {
    id: 'manual',
    label: 'Manual',
    slug: 'manual',
    eyebrow: 'Guía de uso',
    title: 'Manual de TravelPlan',
    description: 'Manual práctico para aprender a usar TravelPlan y aprovechar viajes, planes, calendario, mapas e invitaciones.',
    intro: 'Este manual resume las acciones más habituales dentro de la app para organizar un viaje completo paso a paso.',
    sections: [
      { title: 'Gestionar viajes', body: 'Desde el dashboard puedes crear viajes. En cada ficha puedes editar datos, abrir calendario, revisar mapa y gestionar personas invitadas.' },
      { title: 'Gestionar planes', body: 'Cada plan puede incluir categoría, estado, descripción, fecha, hora, ubicación y enlaces. Los planes sin fecha siguen visibles como pendientes.' },
      { title: 'Preparar el viaje', body: 'Usa alojamiento, checklist y equipaje para completar los detalles prácticos antes de salir.' },
    ],
  },
};

const basePagesEn: Record<PublicBasePageId, PublicPageContent<PublicBasePageId>> = {
  about: {
    id: 'about',
    label: 'About',
    slug: 'about',
    eyebrow: 'About TravelPlan',
    title: 'About TravelPlan',
    description: 'Learn what TravelPlan is and how it helps organize shared trips.',
    intro: 'TravelPlan is a lightweight web app for preparing trips with dates, plans, maps, accommodation, checklist and collaboration.',
    sections: [
      { title: 'One shared base', body: 'Each trip brings together information that usually ends up split between chats, notes, bookings and maps.' },
      { title: 'Built for small groups', body: 'It works for getaways with friends, family trips or couple routes where several people need to check or edit plans.' },
    ],
  },
  privacy: {
    id: 'privacy',
    label: 'Privacy',
    slug: 'privacy',
    eyebrow: 'Data and security',
    title: 'Privacy',
    description: 'Information about the data TravelPlan uses to save trips, members and plans.',
    intro: 'TravelPlan uses the minimum data needed to sign in, save trips and enable collaboration between invited people.',
    sections: [
      { title: 'Data that can be saved', body: 'Account data, trips, dates, locations, plans, accommodation, checklist, luggage and invitations can be saved.', items: ['Google account used to sign in.', 'Information created by the user.', 'Permissions and invitations linked to each trip.'] },
      { title: 'User control', body: 'Each user decides which trips to create, what information to add and who to invite. Sensitive data should be avoided when it is not needed for planning.' },
    ],
  },
  faq: {
    id: 'faq',
    label: 'FAQ',
    slug: 'faq',
    eyebrow: 'Quick help',
    title: 'Frequently asked questions',
    description: 'Common questions about trips, plans, invitations, maps and TravelPlan usage.',
    intro: 'These answers summarize TravelPlan basics so you can start organizing a trip quickly.',
    sections: [
      { title: 'Do I need an account?', body: 'Yes. To save trips and synchronize them across devices you need to sign in with Google.' },
      { title: 'Do plans need a date and location?', body: 'No. You can create pending plans without a date or location and complete them later.' },
      { title: 'Can I invite other people?', body: 'Yes. You can invite people by email and give them permission to view or edit the trip.' },
    ],
  },
  features: {
    id: 'features',
    label: 'Main features',
    slug: 'main-features',
    eyebrow: 'What you can do',
    title: 'Main features',
    description: 'Overview of TravelPlan features for collaborative trips with maps and calendar.',
    intro: 'TravelPlan brings the essential pieces of a trip together so the group can stay organized from one place.',
    sections: [
      { title: 'Trips and plans', body: 'Create trips with dates, destination and members. Add visits, meals, transport or ideas with status, date, location and links.' },
      { title: 'Maps, calendar and preparation', body: 'Check plans on a map, review the calendar, save accommodation and prepare checklist or luggage before leaving.' },
    ],
  },
  'how-it-works': {
    id: 'how-it-works',
    label: 'How it works',
    slug: 'how-it-works',
    eyebrow: 'Basic flow',
    title: 'How it works',
    description: 'Simple usage flow: sign in, create a trip, add plans and invite people.',
    intro: 'The flow is designed to start quickly and complete details as the trip date approaches.',
    sections: [
      { title: '1. Create the trip', body: 'Sign in, set name, destination, dates and the general trip status.' },
      { title: '2. Add and share plans', body: 'Create activities, complete location and links, invite other people and review map, calendar and checklist.' },
    ],
  },
  manual: {
    id: 'manual',
    label: 'Manual',
    slug: 'manual',
    eyebrow: 'User guide',
    title: 'TravelPlan manual',
    description: 'Practical manual to learn how to use TravelPlan and make the most of trips, plans, calendar, maps and invitations.',
    intro: 'This manual summarizes the most common actions in the app so you can organize a complete trip step by step.',
    sections: [
      { title: 'Manage trips', body: 'From the dashboard you can create trips. In each trip detail you can edit data, open calendar, review map and manage invited people.' },
      { title: 'Manage plans', body: 'Each plan can include category, status, description, date, time, location and links. Plans without a date remain visible as unscheduled.' },
      { title: 'Prepare the trip', body: 'Use accommodation, checklist and luggage to complete practical details before leaving.' },
    ],
  },
};

export const publicPages: Record<Locale, Record<PublicPageId, PublicPageContent<PublicPageId>>> = {
  es: {
    ...basePagesEs,
    ...publicSeoPages.es,
  },
  en: {
    ...basePagesEn,
    ...publicSeoPages.en,
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
