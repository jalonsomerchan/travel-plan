import type { Locale } from '../../config/site';
import type { TripRecord } from '../../lib/app/models';
import type { TripAiPromptWizardOptions } from '../../lib/app/trip-ai-prompt-wizard';
import { initLocationPickers } from './plan-location-picker';
import { getPageTranslator } from './shared';

interface WizardControllerOptions {
  locale: Locale;
  onChange: () => void;
}

export interface TripAiPromptWizardController {
  getOptions: () => TripAiPromptWizardOptions;
  syncTrip: (trip: TripRecord) => void;
}

const totalSteps = 5;

function getFieldValue(root: HTMLElement | null, key: string) {
  const checked = root?.querySelector<HTMLInputElement>(`input[name="${key}"]:checked`);
  const field = checked ?? root?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${key}"]`);
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

function getSelectedDates(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLInputElement>('input[name="selectedDates"]:checked') ?? []).map(
    (field) => field.value,
  );
}

function getTypes(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLInputElement>('input[name="types"]:checked') ?? []).map((field) => field.value);
}

function formatDateLabel(date: string, locale: Locale) {
  const value = new Date(`${date}T12:00:00`);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(value);
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    return dates;
  }

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function initTripAiPromptWizard({ locale, onChange }: WizardControllerOptions): TripAiPromptWizardController {
  const root = document.querySelector<HTMLElement>('#trip-ai-prompt-wizard');
  const prevButton = document.querySelector<HTMLButtonElement>('#trip-ai-prompt-prev-step');
  const nextButton = document.querySelector<HTMLButtonElement>('#trip-ai-prompt-next-step');
  const message = document.querySelector<HTMLElement>('#trip-ai-prompt-wizard-message');
  const progress = document.querySelector<HTMLElement>('[data-trip-ai-prompt-step-progress]');
  const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-ai-prompt-step]'));
  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-ai-prompt-step-chip]'));
  const dateOptions = document.querySelector<HTMLElement>('[data-trip-ai-prompt-date-options]');
  const dateList = document.querySelector<HTMLElement>('[data-trip-ai-prompt-date-list]');
  const t = getPageTranslator(locale);
  let currentStep = 0;

  const syncDateMode = () => {
    if (!root || !dateOptions) {
      return;
    }

    const withDates = getFieldValue(root, 'dateMode') === 'with-dates';
    dateOptions.hidden = !withDates;

    dateOptions.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.disabled = !withDates;
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

  const renderTripDates = (trip: TripRecord) => {
    if (!dateList) {
      return;
    }

    const dates = getDateRange(trip.startDate, trip.endDate);
    dateList.innerHTML = dates
      .map(
        (date) => `
          <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)]">
            <input checked name="selectedDates" type="checkbox" value="${date}" />
            <span>${formatDateLabel(date, locale)}</span>
          </label>
        `,
      )
      .join('');
  };

  const getOptions = (): TripAiPromptWizardOptions => ({
    place: getString(root, 'placeName', getString(root, 'placeQuery', '')),
    placeLat: getNumber(root, 'placeLat'),
    placeLng: getNumber(root, 'placeLng'),
    dateMode: getString(root, 'dateMode', 'without-dates') as TripAiPromptWizardOptions['dateMode'],
    selectedDates: getSelectedDates(root),
    scheduleMode: getString(root, 'scheduleMode', 'planned') as TripAiPromptWizardOptions['scheduleMode'],
    types: getTypes(root) as TripAiPromptWizardOptions['types'],
    budgetMode: getString(root, 'budgetMode', 'both') as TripAiPromptWizardOptions['budgetMode'],
    bookingMode: getString(root, 'bookingMode', 'both') as TripAiPromptWizardOptions['bookingMode'],
    accessMode: getString(root, 'accessMode', 'public') as TripAiPromptWizardOptions['accessMode'],
  });

  const syncTrip = (trip: TripRecord) => {
    if (!root) {
      return;
    }

    renderTripDates(trip);
    initLocationPickers();

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

  initLocationPickers();
  syncDateMode();
  updateStepUi();

  return { getOptions, syncTrip };
}
