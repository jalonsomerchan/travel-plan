import { defaultLocale, type Locale } from '../../config/site';
import { joinPathSegments, withBasePath } from '../../utils/paths';

export type AppView =
  | 'dashboard'
  | 'trip'
  | 'trip-plan-suggestions'
  | 'trip-create'
  | 'trip-edit'
  | 'trip-accommodation'
  | 'trip-members'
  | 'trip-invites'
  | 'plan'
  | 'plan-create'
  | 'plan-edit'
  | 'calendar'
  | 'global-calendar'
  | 'map';

const appPaths: Record<AppView, string> = {
  dashboard: 'app',
  trip: 'app/trip',
  'trip-plan-suggestions': 'app/trip-plan-suggestions',
  'trip-create': 'app/trip-create',
  'trip-edit': 'app/trip-edit',
  'trip-accommodation': 'app/trip-accommodation',
  'trip-members': 'app/trip-members',
  'trip-invites': 'app/trip-invites',
  plan: 'app/plan',
  'plan-create': 'app/plan-create',
  'plan-edit': 'app/plan-edit',
  calendar: 'app/calendar',
  'global-calendar': 'app/calendar/all',
  map: 'app/map',
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
