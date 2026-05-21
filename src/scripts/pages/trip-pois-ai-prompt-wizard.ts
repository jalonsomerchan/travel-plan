import type { Locale } from '../../config/site';
import type { TripRecord } from '../../lib/app/models';
import type { TripPoiAiPromptWizardOptions } from '../../lib/app/trip-pois-ai-prompt-wizard';
import { initLocationPickers } from './plan-location-picker';
import { getPageTranslator } from './shared';

interface WizardControllerOptions {
  locale: Locale;
  onChange: () => void;
}

export interface TripPoisAiPromptWizardController {
  getOptions: () => TripPoiAiPromptWizardOptions;
  syncTrip: (trip: TripRecord) => void;
}

const totalSteps = 4;

function getFieldValue(root: HTMLElement | null, key: string) {
  const field = root?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${key}"]`);
  return field?.value ?? '';
}

function getString(root: HTMLElement | null, key: string, fallback: string) {
  const value = getFieldValue(root, key).trim();
  return value || fallback;
}

function getNumber(root: HTMLElement | null, key: string) {
  const value = getString(root, key, '');

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function initTripPoisAiPromptWizard({ locale, onChange }: WizardControllerOptions): TripPoisAiPromptWizardController {
  const root = document.querySelector<HTMLElement>('#trip-pois-ai-prompt-wizard');
  const prevButton = document.querySelector<HTMLButtonElement>('#trip-pois-ai-prompt-prev-step');
  const nextButton = document.querySelector<HTMLButtonElement>('#trip-pois-ai-prompt-next-step');
  const message = document.querySelector<HTMLElement>('#trip-pois-ai-prompt-wizard-message');
  const progress = document.querySelector<HTMLElement>('[data-trip-pois-ai-prompt-step-progress]');
  const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-pois-ai-prompt-step]'));
  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-pois-ai-prompt-step-chip]'));
  const t = getPageTranslator(locale);
  let currentStep = 0;

  const updateStepUi = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });

    chips.forEach((chip, index) => {
      chip.dataset.active = index === currentStep ? 'true' : 'false';
    });

    if (progress) {
      progress.textContent = t('tripPoisAiPrompt.wizard.stepProgress')
        .replace('{current}', String(currentStep + 1))
        .replace('{total}', String(totalSteps));
    }

    if (prevButton) {
      prevButton.disabled = currentStep === 0;
      prevButton.setAttribute('aria-disabled', prevButton.disabled ? 'true' : 'false');
    }

    if (nextButton) {
      nextButton.disabled = currentStep === totalSteps - 1;
      nextButton.setAttribute('aria-disabled', nextButton.disabled ? 'true' : 'false');
      nextButton.textContent = t('tripAi.form.next');
    }
  };

  const goToStep = (step: number) => {
    currentStep = Math.max(0, Math.min(totalSteps - 1, step));
    updateStepUi();
    onChange();
  };

  const getOptions = (): TripPoiAiPromptWizardOptions => ({
    place: getString(root, 'placeName', getString(root, 'placeQuery', '')),
    placeLat: getNumber(root, 'placeLat'),
    placeLng: getNumber(root, 'placeLng'),
    type: getString(root, 'type', 'other') as TripPoiAiPromptWizardOptions['type'],
  });

  const syncTrip = (trip: TripRecord) => {
    if (!root) {
      return;
    }

    const placeQueryInput = root.querySelector<HTMLInputElement>('input[name="placeQuery"]');
    const placeNameInput = root.querySelector<HTMLInputElement>('input[name="placeName"]');
    const placeLatInput = root.querySelector<HTMLInputElement>('input[name="placeLat"]');
    const placeLngInput = root.querySelector<HTMLInputElement>('input[name="placeLng"]');

    const defaultPlaceName = trip.accommodation?.locationName || trip.location;
    const defaultPlaceLat =
      typeof trip.accommodation?.locationLat === 'number' ? trip.accommodation.locationLat : trip.locationLat;
    const defaultPlaceLng =
      typeof trip.accommodation?.locationLng === 'number' ? trip.accommodation.locationLng : trip.locationLng;

    if (placeQueryInput && !placeQueryInput.value) {
      placeQueryInput.value = defaultPlaceName;
    }

    if (placeNameInput && !placeNameInput.value) {
      placeNameInput.value = defaultPlaceName;
    }

    if (placeLatInput && !placeLatInput.value && typeof defaultPlaceLat === 'number') {
      placeLatInput.value = String(defaultPlaceLat);
    }

    if (placeLngInput && !placeLngInput.value && typeof defaultPlaceLng === 'number') {
      placeLngInput.value = String(defaultPlaceLng);
    }

    initLocationPickers();
    onChange();
  };

  root?.addEventListener('input', onChange);
  root?.addEventListener('change', onChange);

  prevButton?.addEventListener('click', () => {
    if (message) {
      message.textContent = t('tripPoisAiPrompt.wizard.helper');
    }
    goToStep(currentStep - 1);
  });

  nextButton?.addEventListener('click', () => {
    if (message) {
      message.textContent = t('tripPoisAiPrompt.wizard.helper');
    }
    goToStep(currentStep + 1);
  });

  initLocationPickers();
  updateStepUi();

  return { getOptions, syncTrip };
}
