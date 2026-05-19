export const defaultLocale = 'es' as const;
export const locales = ['es', 'en'] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

export const siteConfig = {
  name: 'TravelPlan',
  description: 'Planifica viajes compartidos con calendarios, planes y colaboración en tiempo real.',
  url: import.meta.env.ASTRO_SITE ?? 'https://travelplan.alon.one',
  base: import.meta.env.ASTRO_BASE ?? '/',
  repositoryUrl:
    import.meta.env.PUBLIC_REPOSITORY_URL ?? 'https://github.com/jalonsomerchan/travel-plan',
  author: 'Jorge Alonso',
  defaultLocale,
  locales,
};

export type SiteConfig = typeof siteConfig;
