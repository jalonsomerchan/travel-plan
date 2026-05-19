import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getAccommodationLocationLabel,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml } from '../../lib/app/dom';
import { getGoogleMapsDirectionsUrl, getGoogleMapsPlaceUrl } from '../../lib/app/location-links';
import { getOpenStreetMapPlaceUrlFromCoordinates } from '../../lib/app/location-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { subscribePlan } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { addMapTools } from '../maps/leaflet-map-tools';
import { mountNearbyPoiExplorer } from './nearby-poi-explorer';
import {
  ensureFirebaseReady,
  getPageTranslator,
  syncTripNavigation,
  syncPlanShell,
} from './shared';

const accommodationMarkerIcon = L.divIcon({
  className: 'plan-map-accommodation-marker',
  html: `
    <span aria-hidden="true" style="align-items:center;background:#0f766e;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;height:38px;justify-content:center;width:38px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 11.4 12 4l9 7.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V20h4.25v-5.5h4.5V20h4.25v-9.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `,
  iconAnchor: [19, 38],
  iconSize: [38, 38],
  popupAnchor: [0, -38],
});

export function mountPlanPage({ locale }: { locale: Locale }) {
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const description = document.querySelector<HTMLElement>('[data-plan-description]');
  const mapSection = document.querySelector<HTMLElement>('[data-plan-map-section]');
  const mapTarget = document.querySelector<HTMLElement>('[data-plan-map]');
  const editLink = document.querySelector<HTMLAnchorElement>('#plan-edit-link');
  const openOsmLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-osm]');
  const openGoogleLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-google]');
  const openDirectionsLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-directions]');
  const nearbyPoiRoot = document.querySelector<HTMLElement>('[data-nearby-poi]');
  const t = getPageTranslator(locale);
  let map: L.Map | null = null;
  if (!tripId || !planId || !description || !nearbyPoiRoot) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  if (editLink) editLink.href = getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId });
  const nearbyPoiExplorer = mountNearbyPoiExplorer(nearbyPoiRoot, { locale });
  observeSession((user) => {
    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }
    subscribeTrip(tripId, (trip) => {
      if (!trip) return;
      subscribePlan(tripId, planId, (plan) => {
        if (!plan) return;
        syncPlanShell(locale, trip, plan);
        description.textContent = plan.description || t('plan.descriptionEmpty');

        if (map) {
          map.remove();
          map = null;
        }

        if (hasPlanLocation(plan) && mapTarget) {
          if (mapSection) {
            mapSection.hidden = false;
          }

          if (openOsmLink) {
            openOsmLink.href = getOpenStreetMapPlaceUrlFromCoordinates(plan.locationLat, plan.locationLng);
          }

          if (openGoogleLink) {
            openGoogleLink.href = getGoogleMapsPlaceUrl(getPlanLocationLabel(plan));
          }

          if (openDirectionsLink) {
            openDirectionsLink.href = getGoogleMapsDirectionsUrl(plan.locationLat, plan.locationLng);
          }

          map = L.map(mapTarget, {
            zoomControl: true,
            scrollWheelZoom: false,
          }).setView([plan.locationLat, plan.locationLng], 15);

          addMapTools(map, t);

          L.circleMarker([plan.locationLat, plan.locationLng], {
            radius: 10,
            color: '#0f766e',
            fillColor: '#34d399',
            fillOpacity: 0.92,
            weight: 3,
          })
            .bindPopup(escapeHtml(plan.name))
            .addTo(map);

          const accommodation = trip.accommodation;

          if (hasAccommodationLocation(accommodation)) {
            const accommodationLabel = getAccommodationLocationLabel(accommodation);
            const accommodationLat = accommodation.locationLat;
            const accommodationLng = accommodation.locationLng;

            L.marker([accommodationLat, accommodationLng], {
              icon: accommodationMarkerIcon,
              keyboard: true,
              title: accommodationLabel || accommodation.name,
            })
              .bindPopup(escapeHtml(accommodationLabel || accommodation.name))
              .addTo(map);

            map.fitBounds(
              L.latLngBounds([
                [plan.locationLat, plan.locationLng],
                [accommodationLat, accommodationLng],
              ]),
              { maxZoom: 15, padding: [48, 48] },
            );
          }
        } else if (mapSection) {
          mapSection.hidden = true;
        }

        if (hasPlanLocation(plan)) {
          nearbyPoiExplorer.setSource({
            latitude: plan.locationLat,
            longitude: plan.locationLng,
            label: plan.name,
            emptyTitle: '',
            emptyDescription: '',
            emptyActionHref: getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId }),
          });
        } else {
          nearbyPoiExplorer.setSource({
            label: plan.name,
            emptyTitle: t('poi.plan.noLocationTitle'),
            emptyDescription: t('poi.plan.noLocationDescription'),
            emptyActionHref: getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId }),
          });
        }
      });
    });
  });
}
