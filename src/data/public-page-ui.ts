import type { Locale } from '../config/site';

export const publicPageUi: Record<Locale, {
  navLabel: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaAction: string;
}> = {
  es: {
    navLabel: 'Páginas públicas de TravelPlan',
    ctaTitle: 'Empieza a organizar tu próximo viaje',
    ctaDescription: 'Accede al dashboard para crear viajes, añadir planes, revisar mapas y colaborar con otras personas.',
    ctaAction: 'Entrar al dashboard',
  },
  en: {
    navLabel: 'TravelPlan public pages',
    ctaTitle: 'Start organizing your next trip',
    ctaDescription: 'Open the dashboard to create trips, add plans, review maps and collaborate with other people.',
    ctaAction: 'Open dashboard',
  },
};

export function getPublicPageUi(locale: Locale) {
  return publicPageUi[locale];
}
