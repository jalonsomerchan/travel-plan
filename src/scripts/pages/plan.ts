import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Locale } from '../../config/site';
import {
  hasAccommodationLocation,
} from '../../lib/app/accommodation';
import { normalizeAiGuideText } from '../../lib/app/ai-guide-text';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { getGoogleMapsDirectionsUrl, getGoogleMapsPlaceUrl } from '../../lib/app/location-links';
import { getOpenStreetMapPlaceUrlFromCoordinates } from '../../lib/app/location-links';
import { buildPlanAiTourPrompt } from '../../lib/app/plan-ai-tour-prompt';
import { isSafeExternalPlanUrl } from '../../lib/app/plan-links';
import { getPlanLocationLabel, hasPlanLocation } from '../../lib/app/plan-location';
import { getAppUrl } from '../../lib/app/routes';
import { getChatGptPromptUrl } from '../../lib/app/trip-ai-prompt';
import type { PlanRecord, TripPointOfInterestRecord, TripRecord } from '../../lib/app/models';
import { deletePlan, subscribePlan, subscribeTripPlans, updatePlan } from '../../lib/firebase/plans';
import { subscribeTripPointsOfInterest } from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { createSubscriptionScope } from '../../lib/firebase/subscription-scope';
import { subscribeTrip } from '../../lib/firebase/trips';
import { addMapTools } from '../maps/leaflet-map-tools';
import { addPlanAccommodationFocusControl } from '../maps/plan-focus';
import { splitLocatedPlans } from '../maps/trip-plan-layers';
import {
  accommodationMarkerIcon,
  createPlanMarkerIcon,
  createTripPoiIcon,
  getAccommodationMarkerLabel,
  getPlanPopupHtml,
} from '../maps/trip-markers';
import {
  addMapVisibilityControl,
  getMapVisibilityState,
  type MapVisibilityPreferences,
  syncCurrentLocationVisibility,
} from '../maps/visibility';
import { mountNearbyPoiExplorer } from './nearby-poi-explorer';
import {
  ensureFirebaseReady,
  getCategoryLabel,
  getPageTranslator,
  redirectTo,
  syncTripNavigation,
  syncPlanShell,
} from './shared';

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

function focusPlanMap(map: L.Map, center: L.LatLngExpression) {
  map.invalidateSize();
  map.setView(center, Math.max(map.getZoom(), 15));
}

function syncLayerVisibility(map: L.Map, layer: L.LayerGroup, visible: boolean) {
  if (visible && !map.hasLayer(layer)) {
    layer.addTo(map);
  }

  if (!visible && map.hasLayer(layer)) {
    layer.removeFrom(map);
  }
}

function stopGuideSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function playGuideSpeech(text: string, locale: Locale) {
  stopGuideSpeech();

  if (!('speechSynthesis' in window)) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === 'es' ? 'es-ES' : 'en-US';
  window.speechSynthesis.speak(utterance);
  return true;
}

export function mountPlanPage({ locale }: { locale: Locale }) {
  const params = new URL(window.location.href).searchParams;
  const tripId = params.get('trip') ?? '';
  const planId = params.get('plan') ?? '';
  const description = document.querySelector<HTMLElement>('[data-plan-description]');
  const aiGuideSection = document.querySelector<HTMLElement>('[data-plan-ai-guide-section]');
  const aiGuideText = document.querySelector<HTMLElement>('[data-plan-ai-guide-text]');
  const aiGuidePlayButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-guide-play]');
  const aiGuideStopButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-guide-stop]');
  const aiGuideMessage = document.querySelector<HTMLElement>('[data-plan-ai-guide-message]');
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
  const aiTourResultInput = document.querySelector<HTMLTextAreaElement>('[data-plan-ai-tour-result]');
  const aiTourSaveGuideButton = document.querySelector<HTMLButtonElement>('[data-plan-ai-tour-save-guide]');
  const aiTourSaveMessage = document.querySelector<HTMLElement>('[data-plan-ai-tour-save-message]');
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
  let mapLayers:
    | {
        currentPlan: L.LayerGroup;
        proposedPlans: L.LayerGroup;
        plans: L.LayerGroup;
        accommodation: L.LayerGroup;
        tripPois: L.LayerGroup;
      }
    | null = null;
  let planAccommodationFocusControl: ReturnType<typeof addPlanAccommodationFocusControl> | null = null;
  let currentPoints: TripPointOfInterestRecord[] = [];
  let currentTrip: TripRecord | null = null;
  let currentPlan: PlanRecord | null = null;
  let currentPlans: PlanRecord[] = [];
  let currentAiGuide = '';
  let visibility = getMapVisibilityState();
  let hasVisibilityControl = false;
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
    const finalPrompt = `${prompt}\n\n${t('plan.aiTour.plainNarrationInstruction')}`;

    aiTourOutput.value = finalPrompt;

    if (aiTourChatGptLink) {
      aiTourChatGptLink.href = getChatGptPromptUrl(finalPrompt);
    }
  };

  aiTourOpenButton?.addEventListener('click', () => {
    updateAiTourPrompt();
    if (aiTourResultInput) {
      aiTourResultInput.value = currentAiGuide;
    }
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

  aiTourSaveGuideButton?.addEventListener('click', async () => {
    if (!currentPlan || !aiTourResultInput) {
      return;
    }

    const aiGuide = normalizeAiGuideText(aiTourResultInput.value);

    if (!aiGuide) {
      setMessage(aiTourSaveMessage, t('plan.aiTour.saveEmpty'), 'danger');
      aiTourResultInput.focus();
      return;
    }

    aiTourResultInput.value = aiGuide;
    setButtonBusy(aiTourSaveGuideButton, true, t('plan.aiTour.saveGuide'), t('common.saving'));

    try {
      await updatePlan(tripId, planId, { ...currentPlan, aiGuide });
      setMessage(aiTourSaveMessage, t('plan.aiTour.savedGuide'), 'success');
    } catch (error) {
      setMessage(
        aiTourSaveMessage,
        error instanceof Error ? error.message : t('plan.aiTour.saveError'),
        'danger',
      );
    } finally {
      setButtonBusy(aiTourSaveGuideButton, false, t('plan.aiTour.saveGuide'), t('common.saving'));
    }
  });

  aiGuidePlayButton?.addEventListener('click', () => {
    if (!currentAiGuide) {
      return;
    }

    const supported = playGuideSpeech(currentAiGuide, locale);
    setMessage(
      aiGuideMessage,
      supported ? t('plan.aiGuide.playing') : t('plan.aiGuide.unsupported'),
      supported ? 'success' : 'danger',
    );
  });

  aiGuideStopButton?.addEventListener('click', () => {
    stopGuideSpeech();
    setMessage(aiGuideMessage, t('plan.aiGuide.stopped'), 'success');
  });

  window.addEventListener('beforeunload', stopGuideSpeech);

  deleteButton?.addEventListener('click', async () => {
    const confirmed = window.confirm(t('plan.deleteConfirm'));

    if (!confirmed) {
      return;
    }

    setButtonBusy(deleteButton, true, t('plan.delete'), t('common.saving'));

    try {
      stopGuideSpeech();
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

  const applyVisibility = (nextVisibility: MapVisibilityPreferences) => {
    visibility = nextVisibility;

    if (!map || !mapLayers) {
      return;
    }

    syncLayerVisibility(map, mapLayers.proposedPlans, visibility.proposedPlans);
    syncLayerVisibility(map, mapLayers.plans, visibility.plans);
    syncLayerVisibility(map, mapLayers.accommodation, visibility.accommodation);
    syncLayerVisibility(map, mapLayers.tripPois, visibility.tripPois);
    syncCurrentLocationVisibility(visibility.currentLocation);
  };

  const syncPlanMap = () => {
    if (!currentTrip || !currentPlan || !mapSection || !mapTarget) {
      return;
    }

    if (!hasPlanLocation(currentPlan)) {
      mapSection.hidden = true;
      if (map) {
        map.remove();
        map = null;
        mapLayers = null;
      }
      return;
    }

    mapSection.hidden = false;

    if (!map) {
      map = L.map(mapTarget, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([currentPlan.locationLat, currentPlan.locationLng], 15);

      addMapTools(map, t);
      mapLayers = {
        currentPlan: L.layerGroup().addTo(map),
        proposedPlans: L.layerGroup().addTo(map),
        plans: L.layerGroup().addTo(map),
        accommodation: L.layerGroup().addTo(map),
        tripPois: L.layerGroup().addTo(map),
      };
      planAccommodationFocusControl = addPlanAccommodationFocusControl(map, t, () => {
        const accommodation = currentTrip?.accommodation;

        if (!currentPlan || !hasPlanLocation(currentPlan) || !hasAccommodationLocation(accommodation)) {
          return null;
        }

        return [
          [currentPlan.locationLat, currentPlan.locationLng],
          [accommodation.locationLat, accommodation.locationLng],
        ];
      });
      ensureMapVisibilityControl();
    }

    if (!mapLayers) {
      return;
    }

    const currentPlanLatLng = L.latLng(currentPlan.locationLat, currentPlan.locationLng);
    const { proposedPlans, plans } = splitLocatedPlans(
      currentPlans.filter((plan) => plan.id !== currentPlan.id),
    );

    Object.values(mapLayers).forEach((layer) => layer.clearLayers());

    L.marker(currentPlanLatLng, {
      icon: createPlanMarkerIcon(currentPlan, locale, { emphasized: true }),
      keyboard: true,
      title: currentPlan.name,
    })
      .bindPopup(
        getPlanPopupHtml(
          locale,
          tripId,
          currentPlan,
          getCategoryLabel(locale, currentPlan.category),
          getPlanLocationLabel(currentPlan),
          t,
        ),
      )
      .addTo(mapLayers.currentPlan);

    const renderSecondaryPlan = (plan: PlanRecord, layer: L.LayerGroup) => {
      if (!hasPlanLocation(plan)) {
        return;
      }

      if (!visibility.categories[plan.category]) {
        return;
      }

      const categoryLabel = getCategoryLabel(locale, plan.category);
      const latLng = L.latLng(plan.locationLat, plan.locationLng);

      L.marker(latLng, {
        icon: createPlanMarkerIcon(plan, locale, { muted: true }),
        keyboard: true,
        title: plan.name,
      })
        .bindPopup(getPlanPopupHtml(locale, tripId, plan, categoryLabel, getPlanLocationLabel(plan), t))
        .addTo(layer);
    };

    proposedPlans.forEach((plan) => renderSecondaryPlan(plan, mapLayers.proposedPlans));
    plans.forEach((plan) => renderSecondaryPlan(plan, mapLayers.plans));

    currentPoints.forEach((point) => {
      const latLng = L.latLng(point.locationLat, point.locationLng);

      L.marker(latLng, {
        icon: createTripPoiIcon(point),
        keyboard: true,
        title: point.name,
      })
        .bindPopup(`<strong>${escapeHtml(point.name)}</strong><br />${escapeHtml(point.locationName)}`)
        .addTo(mapLayers.tripPois);
    });

    const accommodation = currentTrip.accommodation;
    planAccommodationFocusControl?.setVisible(hasAccommodationLocation(accommodation));

    if (hasAccommodationLocation(accommodation)) {
      const accommodationLabel = getAccommodationMarkerLabel(accommodation);
      const accommodationLatLng = L.latLng(accommodation.locationLat, accommodation.locationLng);

      L.marker(accommodationLatLng, {
        icon: accommodationMarkerIcon,
        keyboard: true,
        title: accommodationLabel,
      })
        .bindPopup(escapeHtml(accommodationLabel))
        .addTo(mapLayers.accommodation);
    }

    applyVisibility(visibility);
    requestAnimationFrame(() => focusPlanMap(map, currentPlanLatLng));
  };

  const ensureMapVisibilityControl = () => {
    if (!map || hasVisibilityControl) {
      return;
    }

    addMapVisibilityControl(map, t, (nextVisibility) => {
      visibility = nextVisibility;
      syncPlanMap();
    });
    hasVisibilityControl = true;
  };

  const resetState = () => {
    stopGuideSpeech();
    currentPoints = [];
    currentTrip = null;
    currentPlan = null;
    currentPlans = [];
    currentAiGuide = '';
    mapLayers = null;
    planAccommodationFocusControl = null;
    hasVisibilityControl = false;
    if (map) {
      map.remove();
      map = null;
    }
  };

  window.addEventListener('pagehide', () => {
    clearSubscriptions();
    stopGuideSpeech();
  }, { once: true });

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
        currentAiGuide = '';

        if (!trip) return;
        currentTrip = trip;
        syncPlanMap();

        planSubscriptions.add(
          subscribePlan(tripId, planId, (plan) => {
            if (!plan) return;
            currentPlan = plan;
            updateAiTourPrompt();
            syncPlanShell(locale, trip, plan);
            description.textContent = plan.description || t('plan.descriptionEmpty');
            currentAiGuide = plan.aiGuide?.trim() ?? '';

            if (aiGuideSection && aiGuideText) {
              aiGuideSection.hidden = !currentAiGuide;
              aiGuideText.textContent = currentAiGuide;
            }

            if (aiTourResultInput && document.activeElement !== aiTourResultInput) {
              aiTourResultInput.value = currentAiGuide;
            }

            if (!currentAiGuide) {
              stopGuideSpeech();
            }

            renderPlanLinks(linksSection, linksList, plan.links);

            if (hasPlanLocation(plan) && mapTarget) {
              if (openOsmLink) {
                openOsmLink.href = getOpenStreetMapPlaceUrlFromCoordinates(plan.locationLat, plan.locationLng);
              }

              if (openGoogleLink) {
                openGoogleLink.href = getGoogleMapsPlaceUrl(getPlanLocationLabel(plan));
              }

              if (openDirectionsLink) {
                openDirectionsLink.href = getGoogleMapsDirectionsUrl(plan.locationLat, plan.locationLng);
              }
            } else if (mapSection) {
              mapSection.hidden = true;
            }

            syncPlanMap();

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
        syncPlanMap();
      }),
    );

    subscriptions.add(
      subscribeTripPlans(tripId, (plans) => {
        currentPlans = plans;
        syncPlanMap();
      }),
    );
  });
}
