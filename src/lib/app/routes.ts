import { defaultLocale, type Locale } from '../../config/site';
import { joinPathSegments, withBasePath } from '../../utils/paths';

export type AppView = 'dashboard' | 'trip' | 'plan' | 'calendar' | 'global-calendar';

const appPaths: Record<AppView, string> = {
  dashboard: 'app',
  trip: 'app/trip',
  plan: 'app/plan',
  calendar: 'app/calendar',
  'global-calendar': 'app/calendar/all',
};

export function getLocalizedAppPath(locale: Locale, view: AppView) {
  const prefix = locale === defaultLocale ? '' : locale;

  return withBasePath(joinPathSegments(prefix, appPaths[view]));
}

export function getAppUrl(
  locale: Locale,
  view: AppView,
  params: Record<string, string | undefined> = {},
) {
  const url = new URL(getLocalizedAppPath(locale, view), window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return `${url.pathname}${url.search}`;
}
