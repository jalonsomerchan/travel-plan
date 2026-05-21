import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  getAccommodationLocationLabel,
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { getGoogleMapsDirectionsUrl, getGoogleMapsPlaceUrl } from '../../lib/app/location-links';
import { getOpenStreetMapPlaceUrlFromCoordinates } from '../../lib/app/location-links';
import { buildPlanAiTourPrompt } from '../../lib/app/plan-ai-tour-prompt';
import { isSafeExternalPlanUrl } from '../../lib/app/plan-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { getAppUrl } from '../../lib/app/routes';
import { getChatGptPromptUrl } from '../../lib/app/trip-ai-prompt';
import type { PlanRecord, TripPointOfInterestRecord, TripRecord } from '../../lib/app/models';
import { deletePlan, subscribePlan } from '../../lib/firebase/plans';
import { subscribeTripPointsOfInterest } from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { addMapTools } from '../maps/leaflet-map-tools';
import { mountNearbyPoiExplorer } from './nearby-poi-explorer';
import {
  ensureFirebaseReady,
  getPageTranslator,
  redirectTo,
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

function addTripPoiMarkers(layer: L.LayerGroup, points: TripPointOfInterestRecord[]) {
  layer.clearLayers();
  points.forEach((point) => {
    L.marker([point.locationLat, point.locationLng], {
      icon: L.divIcon({
        className: 'plan-map-trip-poi-marker',
        html: `
          <span aria-hidden="true" style="align-items:center;background:#2563eb;border:3px solid #ffffff;border-radius:999px;box-shadow:0 10px 24px rgba(15,23,42,.28);color:#ffffff;display:flex;font-weight:900;height:32px;justify-content:center;width:32px;">
            ${escapeHtml(resolveTripPoiIcon(point.icon))}
          </span>
        `,
        iconAnchor: [16, 32],
        iconSize: [32, 32],
        popupAnchor: [0, -32],
      }),
      keyboard: true,
      title: point.name,
    })
      .bindPopup(`<strong>${escapeHtml(point.name)}</strong><br />${escapeHtml(point.locationName)}`)
      .addTo(layer);
  });
}

function renderPlanLinks(linksSection: HTMLElement | null, linksList: HTMLElement | null, planLinks: { label: string; url: string }[]) {
  const safeLinks = planLinks.filter((link) => isSafeExternalPlanUrl(link.url));

  if (!linksSection || !linksList) {
    return;
  }

  linksSection.hidden = safeLinks.length === 0;
  linksList.innerHTML = safeLinks
    .map(
      (link) => `
        <li>
          <a class="app-card-link" data-variant="secondary" href="${escapeHtml(link.url)}" rel="noopener noreferrer" target="_blank">
            ${escapeHtml(link.label || link.url)}
          </a>
        </li>
      `,
    )
    .join('');
}

export function mountPlanPage({ locale }: { locale: Locale }) {
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const description = document.querySelector<HTMLElement>('[data-plan-description]');
  const mapSection = document.querySelector<HTMLElement>('[data-plan-map-section]');
  const mapTarget = document.querySelector<HTMLElement>('[data-plan-map]');
  const linksSection = document.querySelector<HTMLElement>('[data-plan-links-section]');
  const linksList = document.querySelector<HTMLElement>('[data-plan-links-list]');
  const editLink = document.querySelector<HTMLAnchorElement>('#plan-edit-link');
  const visibleEditLink = document.querySelector<HTMLAnchorElement>('[data-plan-edit-visible-link]');
  const aiTourOpenButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-tour-open]');
  const aiTourModal = document.querySelector<HTMLDialogElement>('[data-plan-ai-tour-modal]');
  const aiTourCloseButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-tour-close]');
  const aiTourOutput = document.querySelector<HTMLTextAreaElement>('[data-plan-ai-tour-output]');
  const aiTourCopyButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-tour-copy]');
  const aiTourChatGptLink = document.querySelector<HTMLAnchorElement>('[data-plan-ai-tour-chatgpt]');
  const aiTourMessage = document.querySelector<HTMLElement>('[data-plan-ai-tour-message]');
  const deleteButton = document.querySelector<HTMLButtonElement>('[data-plan-delete-button]');
  const deleteMessage = document.querySelector<HTMLElement>('[data-plan-delete-message]');
  const openOsmLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-osm]');
  const openGoogleLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-google]');
  const openDirectionsLink = document.querySelector<HTMLAnchorElement>('[data-plan-open-directions]');
  const nearbyPoiRoot = document.querySelector<HTMLElement>('[data-nearby-poi]');
  const t = getPageTranslator(locale);
  const subscriptions = createSubscriptionScope();
  const planSubscriptions = createSubscriptionScope();
  let map: L.Map | null = null;
  let poiLayer: L.LayerGroup | null = null;
  let currentPoints: TripPointOfInterestRecord[] = [];
  let currentTrip: TripRecord | null = null;
  let currentPlan: PlanRecord | null = null;
  if (!tripId || !planId || !description || !nearbyPoiRoot) return;
  if (!ensureFirebaseReady(locale)) return;
  syncTripNavigation(locale, tripId);
  nearbyPoiRoot.dataset.tripId = tripId;
  const planEditUrl = getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId });
  if (editLink) editLink.href = planEditUrl;
  if (visibleEditLink) visibleEditLink.href = planEditUrl;

  const getAiTourFieldValue = (name: string, fallback: string) =>
    aiTourModal?.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? fallback;

  const updateAiTourPrompt = () => {
    if (!currentTrip || !currentPlan || !aiTourOutput) {
      return;
    }

    const prompt = buildPlanAiTourPrompt(currentTrip, currentPlan, locale, {
      tone: getAiTourFieldValue('planAiTourTone', 'serious') as 'serious' | 'fun' | 'storyteller',
      length: getAiTourFieldValue('planAiTourLength', 'standard') as 'short' | 'standard' | 'detailed',
      focus: getAiTourFieldValue('planAiTourFocus', 'mixed') as 'history' | 'practical' | 'mixed',
    });

    aiTourOutput.value = prompt;

    if (aiTourChatGptLink) {
      aiTourChatGptLink.href = getChatGptPromptUrl(prompt);
    }
  };

  aiTourOpenButton?.addEventListener('click', () => {
    updateAiTourPrompt();
    aiTourModal?.showModal();
  });

  aiTourCloseButton?.addEventListener('click', () => {
    aiTourModal?.close();
  });

  aiTourModal?.addEventListener('click', (event) => {
    if (event.target === aiTourModal) {
      aiTourModal.close();
    }
  });

  aiTourModal?.addEventListener('change', () => {
    updateAiTourPrompt();
  });

  aiTourCopyButton?.addEventListener('click', async () => {
    if (!aiTourOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(aiTourOutput.value);
      setMessage(aiTourMessage, t('plan.aiTour.copied'), 'success');
    } catch {
      aiTourOutput.focus();
      aiTourOutput.select();
      setMessage(aiTourMessage, t('plan.aiTour.copyFallback'), 'danger');
    }
  });

  deleteButton?.addEventListener('click', async () => {
    const confirmed = window.confirm(t('plan.deleteConfirm'));

    if (!confirmed) {
      return;
    }

    setButtonBusy(deleteButton, true, t('plan.delete'), t('common.saving'));

    try {
      await deletePlan(tripId, planId);
      redirectTo(locale, 'trip', { trip: tripId });
    } catch (error) {
      setMessage(deleteMessage, error instanceof Error ? error.message : t('plan.deleteError'), 'danger');
      setButtonBusy(deleteButton, false, t('plan.delete'), t('common.saving'));
    }
  });
  const nearbyPoiExplorer = mountNearbyPoiExplorer(nearbyPoiRoot, { locale });

  const clearSubscriptions = () => {
    subscriptions.clear();
    planSubscriptions.clear();
  };

  const resetState = () => {
    currentPoints = [];
    currentTrip = null;
    currentPlan = null;
    poiLayer = null;
    if (map) {
      map.remove();
      map = null;
    }
  };

  window.addEventListener('pagehide', clearSubscriptions, { once: true });

  observeSession((user) => {
    clearSubscriptions();
    resetState();

    if (!user) {
      window.location.href = locale === 'es' ? '/' : `/${locale}/`;
      return;
    }

    subscriptions.add(
      subscribeTrip(tripId, (trip) => {
        planSubscriptions.clear();
        currentPlan = null;

        if (!trip) return;
        currentTrip = trip;

        planSubscriptions.add(
          subscribePlan(tripId, planId, (plan) => {
            if (!plan) return;
            currentPlan = plan;
            updateAiTourPrompt();
            syncPlanShell(locale, trip, plan);
            description.textContent = plan.description || t('plan.descriptionEmpty');
            renderPlanLinks(linksSection, linksList, plan.links);

            if (map) {
              map.remove();
              map = null;
              poiLayer = null;
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
              poiLayer = L.layerGroup().addTo(map);

              L.circleMarker([plan.locationLat, plan.locationLng], {
                radius: 10,
                color: '#0f766e',
                fillColor: '#34d399',
                fillOpacity: 0.92,
                weight: 3,
              })
                .bindPopup(escapeHtml(plan.name))
                .addTo(map);

              addTripPoiMarkers(poiLayer, currentPoints);

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
                kind: 'plan',
                emptyTitle: '',
                emptyDescription: '',
                emptyActionHref: getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId }),
              });
            } else {
              nearbyPoiExplorer.setSource({
                label: plan.name,
                kind: 'plan',
                emptyTitle: t('poi.plan.noLocationTitle'),
                emptyDescription: t('poi.plan.noLocationDescription'),
                emptyActionHref: getAppUrl(locale, 'plan-edit', { trip: tripId, plan: planId }),
              });
            }
          }),
        );
      }),
    );

    subscriptions.add(
      subscribeTripPointsOfInterest(tripId, (points) => {
        currentPoints = points;
        if (poiLayer) {
          addTripPoiMarkers(poiLayer, currentPoints);
        }
      }),
    );
  });
}
