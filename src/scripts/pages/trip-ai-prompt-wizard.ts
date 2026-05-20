import type { Locale } from '../../config/site';
import type { TripRecord } from '../../lib/app/models';
import type { TripAiPromptWizardOptions } from '../../lib/app/trip-ai-prompt-wizard';
import { getPageTranslator } from './shared';

interface WizardControllerOptions {
  locale: Locale;
  onChange: () => void;
}

export interface TripAiPromptWizardController {
  getOptions: () => TripAiPromptWizardOptions;
  syncTrip: (trip: TripRecord) => void;
}

const totalSteps = 4;

function getFieldValue(root: HTMLElement | null, key: string) {
  const checked = root?.querySelector<HTMLInputElement>(`input[name="${key}"]:checked`);
  const field = checked ?? root?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${key}"]`);
  return field?.value ?? '';
}

function getString(root: HTMLElement | null, key: string, fallback: string) {
  const value = getFieldValue(root, key).trim();
  return value || fallback;
}

function getTypes(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLInputElement>('input[name="types"]:checked') ?? []).map((field) => field.value);
}

export function initTripAiPromptWizard({ locale, onChange }: WizardControllerOptions): TripAiPromptWizardController {
  const root = document.querySelector<HTMLElement>('#trip-ai-prompt-wizard');
  const prevButton = document.querySelector<HTMLButtonElement>('#trip-ai-prompt-prev-step');
  const nextButton = document.querySelector<HTMLButtonElement>('#trip-ai-prompt-next-step');
  const message = document.querySelector<HTMLElement>('#trip-ai-prompt-wizard-message');
  const progress = document.querySelector<HTMLElement>('[data-trip-ai-prompt-step-progress]');
  const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-ai-prompt-step]'));
  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-ai-prompt-step-chip]'));
  const dateFields = document.querySelector<HTMLElement>('[data-trip-ai-prompt-date-fields]');
  const t = getPageTranslator(locale);
  let currentStep = 0;

  const syncDateMode = () => {
    if (!root || !dateFields) {
      return;
    }

    const isScheduled = getFieldValue(root, 'dateMode') !== 'unscheduled';
    dateFields.hidden = !isScheduled;
    dateFields.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.disabled = !isScheduled;
    });
  };

  const updateStepUi = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });

    chips.forEach((chip, index) => {
      chip.dataset.active = index === currentStep ? 'true' : 'false';
    });

    if (progress) {
      progress.textContent = t('tripAi.form.stepProgress')
        .replace('{current}', String(currentStep + 1))
        .replace('{total}', String(totalSteps));
    }

    if (prevButton) {
      prevButton.hidden = currentStep === 0;
      prevButton.disabled = currentStep === 0;
    }

    if (nextButton) {
      nextButton.textContent = currentStep === totalSteps - 1 ? t('tripAiPrompt.wizard.refreshPrompt') : t('tripAi.form.next');
    }
  };

  const goToStep = (step: number) => {
    currentStep = Math.max(0, Math.min(totalSteps - 1, step));
    updateStepUi();
    onChange();
  };

  const getOptions = (): TripAiPromptWizardOptions => ({
    place: getString(root, 'place', ''),
    dateMode: getString(root, 'dateMode', 'scheduled') as TripAiPromptWizardOptions['dateMode'],
    startDate: getString(root, 'startDate', ''),
    endDate: getString(root, 'endDate', ''),
    planMode: getString(root, 'planMode', 'itinerary') as TripAiPromptWizardOptions['planMode'],
    types: getTypes(root),
    tourismStyle: getString(root, 'tourismStyle', 'balanced') as TripAiPromptWizardOptions['tourismStyle'],
    budgetMode: getString(root, 'budgetMode', 'both') as TripAiPromptWizardOptions['budgetMode'],
    accessMode: getString(root, 'accessMode', 'public') as TripAiPromptWizardOptions['accessMode'],
  });

  const syncTrip = (trip: TripRecord) => {
    if (!root) {
      return;
    }

    const placeInput = root.querySelector<HTMLInputElement>('input[name="place"]');
    const startDateInput = root.querySelector<HTMLInputElement>('input[name="startDate"]');
    const endDateInput = root.querySelector<HTMLInputElement>('input[name="endDate"]');

    if (placeInput && !placeInput.value) {
      placeInput.value = trip.location;
    }

    [startDateInput, endDateInput].forEach((input) => {
      if (!input) return;
      input.min = trip.startDate;
      input.max = trip.endDate;
    });

    if (startDateInput && !startDateInput.value) {
      startDateInput.value = trip.startDate;
    }

    if (endDateInput && !endDateInput.value) {
      endDateInput.value = trip.endDate;
    }

    syncDateMode();
    onChange();
  };

  root?.addEventListener('input', () => {
    syncDateMode();
    onChange();
  });

  root?.addEventListener('change', () => {
    syncDateMode();
    onChange();
  });

  prevButton?.addEventListener('click', () => {
    if (message) {
      message.textContent = t('tripAiPrompt.wizard.helper');
    }
    goToStep(currentStep - 1);
  });

  nextButton?.addEventListener('click', () => {
    if (message) {
      message.textContent = t('tripAiPrompt.wizard.helper');
    }
    goToStep(currentStep + 1);
  });

  syncDateMode();
  updateStepUi();

  return { getOptions, syncTrip };
}
