import type { Locale } from '../config/site';

export const publicPageUi: Record<Locale, {
  navLabel: string;
  relatedTitle: string;
  relatedDescription: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaAction: string;
}> = {
  es: {
    navLabel: 'Páginas públicas de TravelPlan',
    relatedTitle: 'Guías relacionadas',
    relatedDescription: 'Sigue explorando consejos, trucos y recomendaciones para organizar mejor tu viaje.',
    ctaTitle: 'Empieza a organizar tu próximo viaje',
    ctaDescription: 'Accede al dashboard para crear viajes, añadir planes, revisar mapas y colaborar con otras personas.',
    ctaAction: 'Entrar al dashboard',
  },
  en: {
    navLabel: 'TravelPlan public pages',
    relatedTitle: 'Related guides',
    relatedDescription: 'Keep exploring tips, tricks and recommendations to organize your trip better.',
    ctaTitle: 'Start organizing your next trip',
    ctaDescription: 'Open the dashboard to create trips, add plans, review maps and collaborate with other people.',
    ctaAction: 'Open dashboard',
  },
};

export function getPublicPageUi(locale: Locale) {
  return publicPageUi[locale];
}
