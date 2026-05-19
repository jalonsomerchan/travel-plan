import type { Locale } from '../../config/site';
import { getAccommodationLocationLabel, hasAccommodationLocation } from '../../lib/app/accommodation';
import { formatDateRange } from '../../lib/app/format';
import { getAppUrl } from '../../lib/app/routes';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { mountNearbyPoiExplorer } from './nearby-poi-explorer';
import {
  ensureFirebaseReady,
  getPageTranslator,
  revealAppShell,
  setAppShellDescription,
  setAppShellMeta,
  setAppShellTitle,
  syncTripNavigation,
} from './shared';

export function mountTripPoisPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const explorerRoot = document.querySelector<HTMLElement>('[data-nearby-poi]');
  const t = getPageTranslator(locale);

  if (!tripId || !explorerRoot) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);
  const explorer = mountNearbyPoiExplorer(explorerRoot, { locale });

  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscribeTrip(tripId, (trip) => {
      if (!trip) {
        setAppShellTitle(t('trip.notFound'));
        setAppShellDescription('');
        setAppShellMeta([]);
        revealAppShell();
        return;
      }

      setAppShellTitle(t('tripPois.titleWithTrip').replace('{trip}', trip.name));
      setAppShellDescription(trip.location);
      setAppShellMeta([formatDateRange(trip.startDate, trip.endDate, locale), trip.ownerEmail]);
      explorerRoot.dataset.tripId = tripId;

      if (hasAccommodationLocation(trip.accommodation)) {
        explorer.setSource({
          latitude: trip.accommodation.locationLat,
          longitude: trip.accommodation.locationLng,
          label: trip.accommodation.name || getAccommodationLocationLabel(trip.accommodation) || trip.name,
          emptyTitle: '',
          emptyDescription: '',
        });
      } else {
        explorer.setSource({
          label: trip.name,
          emptyTitle: t('tripPois.noAccommodationTitle'),
          emptyDescription: t('tripPois.noAccommodationDescription'),
          emptyActionHref: getAppUrl(locale, 'trip-accommodation', { trip: tripId }),
        });
      }

      revealAppShell();
    });
  });
}
