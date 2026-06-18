import type { Locale } from '../config/site';
import type { PublicPageContent } from './public-page-types';
import { publicSeoGuidePageIds, publicSeoGuidePages } from './public-seo-generated-guides';
import { publicSeoPagesEn } from './public-seo-pages-en';
import { publicSeoPagesEs } from './public-seo-pages-es';

const publicSeoBasePageIds = [
  'organizador-viajes-grupo',
  'planificador-itinerarios',
  'app-mapas-viaje',
  'checklist-equipaje-viaje',
  'calendario-viaje-compartido',
  'planificar-escapada-fin-semana',
  'organizar-viaje-amigos',
  'viaje-colaborativo-online',
] as const;

export const publicSeoPageIds = [
  ...publicSeoBasePageIds,
  ...publicSeoGuidePageIds,
] as const;

export type PublicSeoPageId = string;

export const publicSeoPages = {
  es: {
    ...publicSeoPagesEs,
    ...publicSeoGuidePages.es,
  },
  en: {
    ...publicSeoPagesEn,
    ...publicSeoGuidePages.en,
  },
} satisfies Record<Locale, Record<PublicSeoPageId, PublicPageContent<PublicSeoPageId>>>;
