import { defaultLocale, locales, type Locale } from '../config/site';
import { joinPathSegments, stripBasePath, withBasePath } from '../utils/paths';
import en from './translations/en.json';
import es from './translations/es.json';
import authLoadingEn from './feature-translations/auth-loading/en.json';
import authLoadingEs from './feature-translations/auth-loading/es.json';
import checklistFormsEn from './feature-translations/checklist-forms/en.json';
import checklistFormsEs from './feature-translations/checklist-forms/es.json';
import destinationLinksEn from './feature-translations/destination-links/en.json';
import destinationLinksEs from './feature-translations/destination-links/es.json';
import footerVersionEn from './feature-translations/footer-version/en.json';
import footerVersionEs from './feature-translations/footer-version/es.json';
import geolocationEn from './feature-translations/geolocation/en.json';
import geolocationEs from './feature-translations/geolocation/es.json';
import globalChecklistsEn from './feature-translations/global-checklists/en.json';
import globalChecklistsEs from './feature-translations/global-checklists/es.json';
import globalTodayEn from './feature-translations/global-today/en.json';
import globalTodayEs from './feature-translations/global-today/es.json';
import invitesEn from './feature-translations/invites/en.json';
import invitesEs from './feature-translations/invites/es.json';
import listViewEn from './feature-translations/list-view/en.json';
import listViewEs from './feature-translations/list-view/es.json';
import mapEn from './feature-translations/map/en.json';
import mapEs from './feature-translations/map/es.json';
import mapVisibilityEn from './feature-translations/map-visibility/en.json';
import mapVisibilityEs from './feature-translations/map-visibility/es.json';
import planFormLayoutEn from './feature-translations/plan-form-layout/en.json';
import planFormLayoutEs from './feature-translations/plan-form-layout/es.json';
import planLinksEn from './feature-translations/plan-links/en.json';
import planLinksEs from './feature-translations/plan-links/es.json';
import poiEn from './feature-translations/poi/en.json';
import poiEs from './feature-translations/poi/es.json';
import pwaStatusEn from './feature-translations/pwa-status/en.json';
import pwaStatusEs from './feature-translations/pwa-status/es.json';
import tripAiPromptEn from './feature-translations/trip-ai-prompt/en.json';
import tripAiPromptEs from './feature-translations/trip-ai-prompt/es.json';
import tripFormLayoutEn from './feature-translations/trip-form-layout/en.json';
import tripFormLayoutEs from './feature-translations/trip-form-layout/es.json';
import tripPoisAiPromptEn from './feature-translations/trip-pois-ai-prompt/en.json';
import tripPoisAiPromptEs from './feature-translations/trip-pois-ai-prompt/es.json';
import tripValidationEn from './feature-translations/trip-validation/en.json';
import tripValidationEs from './feature-translations/trip-validation/es.json';

export type TranslationKey =
  | keyof typeof es
  | keyof typeof authLoadingEs
  | keyof typeof checklistFormsEs
  | keyof typeof destinationLinksEs
  | keyof typeof footerVersionEs
  | keyof typeof geolocationEs
  | keyof typeof globalChecklistsEs
  | keyof typeof globalTodayEs
  | keyof typeof invitesEs
  | keyof typeof listViewEs
  | keyof typeof mapEs
  | keyof typeof mapVisibilityEs
  | keyof typeof planFormLayoutEs
  | keyof typeof planLinksEs
  | keyof typeof poiEs
  | keyof typeof pwaStatusEs
  | keyof typeof tripAiPromptEs
  | keyof typeof tripFormLayoutEs
  | keyof typeof tripPoisAiPromptEs
  | keyof typeof tripValidationEs;

type TranslationDictionary = Record<string, string>;

const translations: Record<Locale, TranslationDictionary> = {
  es: {
    ...es,
    ...authLoadingEs,
    ...checklistFormsEs,
    ...destinationLinksEs,
    ...footerVersionEs,
    ...geolocationEs,
    ...globalChecklistsEs,
    ...globalTodayEs,
    ...invitesEs,
    ...listViewEs,
    ...mapEs,
    ...mapVisibilityEs,
    ...planFormLayoutEs,
    ...planLinksEs,
    ...poiEs,
    ...pwaStatusEs,
    ...tripAiPromptEs,
    ...tripFormLayoutEs,
    ...tripPoisAiPromptEs,
    ...tripValidationEs,
  },
  en: {
    ...en,
    ...authLoadingEn,
    ...checklistFormsEn,
    ...destinationLinksEn,
    ...footerVersionEn,
    ...geolocationEn,
    ...globalChecklistsEn,
    ...globalTodayEn,
    ...invitesEn,
    ...listViewEn,
    ...mapEn,
    ...mapVisibilityEn,
    ...planFormLayoutEn,
    ...planLinksEn,
    ...poiEn,
    ...pwaStatusEn,
    ...tripAiPromptEn,
    ...tripFormLayoutEn,
    ...tripPoisAiPromptEn,
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
