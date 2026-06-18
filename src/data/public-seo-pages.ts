import type { Locale } from '../config/site';
import { publicSeoPagesEn } from './public-seo-pages-en';
import { publicSeoPagesEs } from './public-seo-pages-es';

export const publicSeoPageIds = [
  'organizador-viajes-grupo',
  'planificador-itinerarios',
  'app-mapas-viaje',
  'checklist-equipaje-viaje',
  'calendario-viaje-compartido',
  'planificar-escapada-fin-semana',
  'organizar-viaje-amigos',
  'viaje-colaborativo-online',
] as const;

export type PublicSeoPageId = (typeof publicSeoPageIds)[number];

export const publicSeoPages = {
  es: publicSeoPagesEs,
  en: publicSeoPagesEn,
} satisfies Record<Locale, typeof publicSeoPagesEs>;
