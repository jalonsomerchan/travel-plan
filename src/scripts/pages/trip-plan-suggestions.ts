import type { User } from 'firebase/auth';
import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatDateRange } from '../../lib/app/format';
import { getAppUrl } from '../../lib/app/routes';
import {
  type AiPlanSuggestion,
  type TripPlanSuggestionFilters,
  formatSuggestionCoordinates,
  getTripPlanSuggestionFilters,
  toPlanInputFromAiSuggestion,
  validateTripPlanSuggestionFilters,
} from '../../lib/app/trip-plan-suggestions';
import { generateTripPlanSuggestions } from '../../lib/ai/trip-plan-suggestions';
import { createPlan, subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import { initLocationPickers } from './plan-location-picker';
import {
  ensureFirebaseReady,
  getCategoryLabel,
  getPageTranslator,
  redirectHome,
  syncTripShell,
} from './shared';
import type { PlanRecord, TripRecord } from '../../lib/app/models';

interface SuggestionEntry {
  id: string;
  plan: AiPlanSuggestion;
  isSaving: boolean;
}

export function mountTripPlanSuggestionsPage({ locale }: { locale: Locale }) {
  const totalSteps = 6;
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const form = document.querySelector<HTMLFormElement>('#trip-ai-form');
  const formMessage = document.querySelector<HTMLElement>('#trip-ai-form-message');
  const context = document.querySelector<HTMLElement>('[data-trip-ai-context]');
  const progress = document.querySelector<HTMLElement>('[data-trip-ai-step-progress]');
  const backLink = document.querySelector<HTMLAnchorElement>('#trip-ai-back-link');
  const resultsMessage = document.querySelector<HTMLElement>('[data-trip-ai-results-message]');
  const resultsList = document.querySelector<HTMLElement>('[data-trip-ai-results-list]');
  const resultsLoading = document.querySelector<HTMLElement>('[data-trip-ai-results-loading]');
  const resultsCount = document.querySelector<HTMLElement>('[data-results-count]');
  const resultsActions = document.querySelector<HTMLElement>('[data-trip-ai-results-actions]');
  const loadMoreButton = document.querySelector<HTMLButtonElement>('#trip-ai-load-more');
  const prevStepButton = document.querySelector<HTMLButtonElement>('#trip-ai-prev-step');
  const nextStepButton = document.querySelector<HTMLButtonElement>('#trip-ai-next-step');
  const submitButton = document.querySelector<HTMLButtonElement>('#trip-ai-submit');
  const stepSections = Array.from(document.querySelectorAll<HTMLElement>('[data-trip-ai-step]'));
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentPlans: PlanRecord[] = [];
  let suggestions: SuggestionEntry[] = [];
  let currentUser: User | null = null;
  let currentStep = 0;

  if (!tripId || !form || !resultsList || !resultsMessage || !resultsLoading) {
    return;
  }

  initLocationPickers();

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  if (backLink) {
    backLink.href = getAppUrl(locale, 'trip', { trip: tripId });
  }

  const updateStepUi = () => {
    stepSections.forEach((section, index) => {
      section.hidden = index !== currentStep;
    });

    if (progress) {
      progress.textContent = t('tripAi.form.stepProgress')
        .replace('{current}', String(currentStep + 1))
        .replace('{total}', String(totalSteps));
    }

    if (prevStepButton) {
      prevStepButton.hidden = currentStep === 0;
      prevStepButton.disabled = currentStep === 0;
    }

    if (nextStepButton) {
      nextStepButton.hidden = currentStep === totalSteps - 1;
    }

    if (submitButton) {
      submitButton.hidden = currentStep !== totalSteps - 1;
    }
  };

  const validateCurrentStep = () => {
    if (!currentTrip) {
      return t('trip.notFound');
    }

    const filters = getTripPlanSuggestionFilters(form);

    if (currentStep === 0 && filters.baseLocation.length < 2) {
      return t('tripAi.error.invalidBaseLocation');
    }

    if (currentStep === 1 && (!Number.isFinite(filters.radiusKm) || filters.radiusKm < 1 || filters.radiusKm > 300)) {
      return t('tripAi.error.invalidRadius');
    }

    if (currentStep === 2 && !filters.transportMode) {
      return t('tripAi.error.invalidTransport');
    }

    if (currentStep === 3 && !filters.budgetMode) {
      return t('tripAi.error.invalidBudget');
    }

    if (currentStep === 4 && filters.types.length === 0) {
      return t('tripAi.error.invalidTypes');
    }

    if (currentStep === 5) {
      const validationError = validateTripPlanSuggestionFilters(filters, currentTrip);
      return validationError ? getValidationMessage(validationError, locale) : null;
    }

    return null;
  };

  const goToStep = (step: number) => {
    currentStep = Math.max(0, Math.min(totalSteps - 1, step));
    updateStepUi();
  };

  const syncResultsCount = () => {
    if (!resultsCount) {
      return;
    }

    const visibleCount = suggestions.length;
    resultsCount.textContent = String(visibleCount);
    resultsCount.dataset.tone = visibleCount > 0 ? 'primary' : 'warning';
    if (resultsActions) {
      resultsActions.hidden = visibleCount === 0;
    }
  };

  const setResultsState = (message: string, tone: 'default' | 'success' | 'danger' = 'default') => {
    setMessage(resultsMessage, message, tone);
    syncResultsCount();
  };

  const renderSuggestions = () => {
    syncResultsCount();

    if (suggestions.length === 0) {
      resultsList.innerHTML = '';
      return;
    }

    resultsList.innerHTML = suggestions
      .map(({ id, isSaving, plan }) => {
        const locationLabel = formatSuggestionCoordinates(plan);

        return `
          <article class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-[var(--color-text)]">${escapeHtml(plan.title)}</h3>
                <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(getCategoryLabel(locale, plan.type))}</p>
              </div>
              <span class="status-pill" data-tone="primary">${escapeHtml(t('tripAi.results.candidate'))}</span>
            </div>
            <p class="mt-4 text-sm text-[var(--color-text-muted)]">${escapeHtml(plan.description)}</p>
            <dl class="mt-4 grid gap-3 text-sm text-[var(--color-text-soft)]">
              <div>
                <dt class="font-semibold text-[var(--color-text)]">${escapeHtml(t('tripAi.results.coordinates'))}</dt>
                <dd class="mt-1">${escapeHtml(locationLabel)}</dd>
              </div>
            </dl>
            <div class="mt-5 flex flex-wrap gap-3">
              <button
                class="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-contrast)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] disabled:translate-y-0 disabled:opacity-65"
                data-suggestion-action="save"
                data-suggestion-id="${escapeHtml(id)}"
                ${isSaving ? 'disabled aria-busy="true"' : ''}
                type="button"
              >
                ${escapeHtml(isSaving ? t('tripAi.results.saving') : t('tripAi.results.save'))}
              </button>
              <button
                class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] shadow-[var(--shadow-xs)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
                data-suggestion-action="discard"
                data-suggestion-id="${escapeHtml(id)}"
                type="button"
              >
                ${escapeHtml(t('tripAi.results.discard'))}
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  };

  const setLoading = (loading: boolean) => {
    resultsLoading.hidden = !loading;
    if (loading) {
      resultsList.innerHTML = '';
    }
  };

  const loadSuggestions = async (filters: TripPlanSuggestionFilters, append = false) => {
    if (!currentTrip || !currentUser) {
      return 'error' as const;
    }

    setLoading(true);
    setResultsState(t('tripAi.results.loading'));
    if (loadMoreButton) {
      setButtonBusy(loadMoreButton, true, t('tripAi.results.loadMore'), t('tripAi.results.loadingMore'));
    }

    try {
      const plans = await generateTripPlanSuggestions({
        firebaseUser: currentUser,
        locale,
        trip: currentTrip,
        existingPlans: currentPlans,
        filters,
        alreadySuggestedPlans: suggestions.map((entry) => entry.plan),
      });

      const nextSuggestions = plans.map((plan, index) => ({
        id: `${Date.now()}-${index}`,
        plan,
        isSaving: false,
      }));
      suggestions = append ? [...suggestions, ...nextSuggestions] : nextSuggestions;

      renderSuggestions();

      if (nextSuggestions.length === 0 && !append) {
        setResultsState(t('tripAi.results.empty'));
        return 'empty' as const;
      }

      if (nextSuggestions.length === 0 && append) {
        setResultsState(t('tripAi.results.noMore'));
        return 'empty' as const;
      }

      setResultsState(
        t('tripAi.results.ready')
          .replace('{count}', String(suggestions.length))
          .replace('{trip}', currentTrip.name),
        'success',
      );
      return 'success' as const;
    } catch (error) {
      suggestions = [];
      renderSuggestions();
      setResultsState(getAiErrorMessage(error, locale), 'danger');
      return 'error' as const;
    } finally {
      setLoading(false);
      if (loadMoreButton) {
        setButtonBusy(loadMoreButton, false, t('tripAi.results.loadMore'), t('tripAi.results.loadingMore'));
      }
    }
  };

  const saveSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find((entry) => entry.id === suggestionId);

    if (!suggestion) {
      return;
    }

    suggestion.isSaving = true;
    renderSuggestions();

    try {
      await createPlan(tripId, toPlanInputFromAiSuggestion(suggestion.plan));
      suggestions = suggestions.filter((entry) => entry.id !== suggestionId);
      renderSuggestions();
      setResultsState(t('tripAi.results.savedSuccess'), 'success');

      if (suggestions.length === 0) {
        setResultsState(t('tripAi.results.doneAll'), 'success');
      }
    } catch (error) {
      suggestion.isSaving = false;
      renderSuggestions();
      setResultsState(error instanceof Error ? error.message : t('tripAi.results.saveError'), 'danger');
    }
  };

  const discardSuggestion = (suggestionId: string) => {
    suggestions = suggestions.filter((entry) => entry.id !== suggestionId);
    renderSuggestions();
    setResultsState(
      suggestions.length > 0 ? t('tripAi.results.discarded') : t('tripAi.results.emptyAfterDiscard'),
      'default',
    );
  };

  resultsList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-suggestion-action]');

    if (!button) {
      return;
    }

    const suggestionId = button.dataset.suggestionId ?? '';
    const action = button.dataset.suggestionAction;

    if (action === 'save') {
      void saveSuggestion(suggestionId);
      return;
    }

    if (action === 'discard') {
      discardSuggestion(suggestionId);
    }
  });

  observeSession((user) => {
    if (!user) {
      redirectHome(locale);
      return;
    }

    currentUser = user;

    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;

      if (!trip) {
        setResultsState(t('trip.notFound'), 'danger');
        return;
      }

      syncTripShell(locale, trip);
      if (context) {
        context.textContent = `${trip.name} · ${formatDateRange(trip.startDate, trip.endDate, locale)}`;
      }

      const baseLocationInput = form.elements.namedItem('baseLocationQuery') as HTMLInputElement | null;
      const startDateInput = form.elements.namedItem('startDate') as HTMLInputElement | null;
      const endDateInput = form.elements.namedItem('endDate') as HTMLInputElement | null;

      if (baseLocationInput && !baseLocationInput.value) {
        baseLocationInput.value = trip.accommodation?.locationName || trip.location;
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
    });

    subscribeTripPlans(tripId, (plans) => {
      currentPlans = plans;
    });
  });

  prevStepButton?.addEventListener('click', () => {
    setMessage(formMessage, t('tripAi.form.helper'));
    goToStep(currentStep - 1);
  });

  nextStepButton?.addEventListener('click', () => {
    const validationMessage = validateCurrentStep();

    if (validationMessage) {
      setMessage(formMessage, validationMessage, 'danger');
      return;
    }

    setMessage(formMessage, t('tripAi.form.helper'));
    goToStep(currentStep + 1);
  });

  loadMoreButton?.addEventListener('click', async () => {
    if (!currentTrip) {
      setResultsState(t('trip.notFound'), 'danger');
      return;
    }

    const filters = getTripPlanSuggestionFilters(form);
    const validationError = validateTripPlanSuggestionFilters(filters, currentTrip);

    if (validationError) {
      setResultsState(getValidationMessage(validationError, locale), 'danger');
      return;
    }

    await loadSuggestions(filters, true);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentTrip) {
      setMessage(formMessage, t('trip.notFound'), 'danger');
      return;
    }

    const finalStepValidation = validateCurrentStep();
    if (finalStepValidation) {
      setMessage(formMessage, finalStepValidation, 'danger');
      return;
    }
    const filters = getTripPlanSuggestionFilters(form);

    setButtonBusy(submitButton, true, t('tripAi.form.submit'), t('tripAi.form.submitting'));
    setMessage(formMessage, t('tripAi.form.running'));

    try {
      const status = await loadSuggestions(filters);

      if (status === 'success') {
        setMessage(formMessage, t('tripAi.form.success'), 'success');
      } else if (status === 'empty') {
        setMessage(formMessage, t('tripAi.results.empty'));
      }
    } finally {
      setButtonBusy(submitButton, false, t('tripAi.form.submit'), t('tripAi.form.submitting'));
    }
  });

  updateStepUi();
}

function getValidationMessage(code: ReturnType<typeof validateTripPlanSuggestionFilters>, locale: Locale) {
  const t = getPageTranslator(locale);

  const messages: Record<Exclude<typeof code, null>, string> = {
    baseLocation: t('tripAi.error.invalidBaseLocation'),
    radiusKm: t('tripAi.error.invalidRadius'),
    transportMode: t('tripAi.error.invalidTransport'),
    budgetMode: t('tripAi.error.invalidBudget'),
    types: t('tripAi.error.invalidTypes'),
    dates: t('tripAi.error.invalidDates'),
    dateOrder: t('tripAi.error.invalidDateOrder'),
    tripRange: t('tripAi.error.outsideTripRange'),
  };

  return code ? messages[code] : '';
}

function getAiErrorMessage(error: unknown, locale: Locale) {
  const t = getPageTranslator(locale);
  const status = getErrorStatus(error);

  if (status === 400) {
    return t('tripAi.error.projectId');
  }

  if (status === 401 || status === 403) {
    return t('tripAi.error.authRejected');
  }

  if (error instanceof TypeError) {
    return t('tripAi.error.network');
  }

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;

    if (code === 'timeout') {
      return t('tripAi.error.timeout');
    }

    if (code === 'invalid-response') {
      return t('tripAi.error.invalidResponse');
    }

    if (code === 'missing-config') {
      return t('tripAi.error.missingConfig');
    }

    if (code === 'quota-exhausted') {
      return t('tripAi.error.quota');
    }
  }

  return t('tripAi.error.generic');
}

function getErrorStatus(error: unknown) {
  const cause = (error as Error & { cause?: unknown })?.cause;

  if (!cause || typeof cause !== 'object') {
    return undefined;
  }

  const status = (cause as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}
