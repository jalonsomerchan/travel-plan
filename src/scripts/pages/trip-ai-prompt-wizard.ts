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

const totalSteps = 3;

function getString(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getTypes(formData: FormData) {
  return formData.getAll('types').filter((value): value is string => typeof value === 'string');
}

export function initTripAiPromptWizard({ locale, onChange }: WizardControllerOptions): TripAiPromptWizardController {
  const form = document.querySelector<HTMLFormElement>('#trip-ai-prompt-wizard');
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
    if (!form || !dateFields) {
      return;
    }

    const formData = new FormData(form);
    const isScheduled = formData.get('dateMode') !== 'unscheduled';
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

  const getOptions = (): TripAiPromptWizardOptions => {
    const formData = form ? new FormData(form) : new FormData();

    return {
      place: getString(formData, 'place', ''),
      dateMode: getString(formData, 'dateMode', 'scheduled') as TripAiPromptWizardOptions['dateMode'],
      startDate: getString(formData, 'startDate', ''),
      endDate: getString(formData, 'endDate', ''),
      planMode: getString(formData, 'planMode', 'itinerary') as TripAiPromptWizardOptions['planMode'],
      types: getTypes(formData),
      tourismStyle: getString(formData, 'tourismStyle', 'balanced') as TripAiPromptWizardOptions['tourismStyle'],
      budgetMode: getString(formData, 'budgetMode', 'both') as TripAiPromptWizardOptions['budgetMode'],
      accessMode: getString(formData, 'accessMode', 'public') as TripAiPromptWizardOptions['accessMode'],
    };
  };

  const syncTrip = (trip: TripRecord) => {
    if (!form) {
      return;
    }

    const placeInput = form.elements.namedItem('place') as HTMLInputElement | null;
    const startDateInput = form.elements.namedItem('startDate') as HTMLInputElement | null;
    const endDateInput = form.elements.namedItem('endDate') as HTMLInputElement | null;

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

  form?.addEventListener('input', () => {
    syncDateMode();
    onChange();
  });

  form?.addEventListener('change', () => {
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
