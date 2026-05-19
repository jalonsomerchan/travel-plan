import { defaultLocale, locales, type Locale } from '../config/site';
import { joinPathSegments, stripBasePath, withBasePath } from '../utils/paths';
import en from './translations/en.json';
import es from './translations/es.json';
import mapEn from './feature-translations/map/en.json';
import mapEs from './feature-translations/map/es.json';
import poiEn from './feature-translations/poi/en.json';
import poiEs from './feature-translations/poi/es.json';
import tripValidationEn from './feature-translations/trip-validation/en.json';
import tripValidationEs from './feature-translations/trip-validation/es.json';

export type TranslationKey =
  | keyof typeof es
  | keyof typeof mapEs
  | keyof typeof poiEs
  | keyof typeof tripValidationEs;

type TranslationDictionary = Record<string, string>;

const translations: Record<Locale, TranslationDictionary> = {
  es: {
    ...es,
    ...mapEs,
    ...poiEs,
    ...tripValidationEs,
  },
  en: {
    ...en,
    ...mapEn,
    ...poiEn,
    ...tripValidationEn,
  },
};

export function isLocale(locale: string | undefined): locale is Locale {
  return Boolean(locale && locales.includes(locale as Locale));
}

export function getLocaleFromUrl(pathname: string): Locale {
  const pathnameWithoutBase = stripBasePath(pathname);
  const [, maybeLocale] = pathnameWithoutBase.split('/');

  if (isLocale(maybeLocale)) {
    return maybeLocale;
  }

  return defaultLocale;
}

export function useTranslations(locale: Locale) {
  return function t(key: TranslationKey | string): string {
    return translations[locale]?.[key] ?? translations[defaultLocale][key] ?? key;
  };
}

export function getLocalizedPath(path: string, locale: Locale): string {
  const cleanPath = path.replace(/^\//, '');

  if (locale === defaultLocale) {
    return withBasePath(cleanPath);
  }

  return withBasePath(joinPathSegments(locale, cleanPath));
}

export function getAlternateLocales(currentLocale: Locale) {
  return locales.filter((locale) => locale !== currentLocale);
}
