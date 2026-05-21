import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import type { TripPointOfInterestInput, TripRecord } from '../../lib/app/models';
import {
  getChatGptPromptUrl,
  parseTripPoiAiPromptJson,
  type TripPoiAiPromptCandidate,
} from '../../lib/app/trip-pois-ai-prompt';
import { buildTripPoiAiPromptFromWizard } from '../../lib/app/trip-pois-ai-prompt-builder';
import { createTripPointOfInterest } from '../../lib/firebase/trip-pois';
import { observeSession } from '../../lib/firebase/session';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { resolveTripPoiIcon } from '../../lib/app/trip-poi-icons';
import { initTripPoisAiPromptWizard } from './trip-pois-ai-prompt-wizard';
import {
  ensureFirebaseReady,
  getPageTranslator,
  redirectTo,
  redirectHome,
  syncTripNavigation,
  syncTripShell,
} from './shared';

interface CandidateEntry extends TripPoiAiPromptCandidate {
  id: string;
  selected: boolean;
  saving: boolean;
}

function getCandidateId(candidate: TripPoiAiPromptCandidate) {
  return `poi-candidate-${candidate.sourceIndex}-${candidate.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
}

function toPoiInput(candidate: CandidateEntry): TripPointOfInterestInput {
  return {
    name: candidate.name,
    description: candidate.description,
    type: candidate.type,
    icon: candidate.icon,
    color: candidate.color,
    isVisible: candidate.isVisible,
    locationName: candidate.locationName,
    locationLat: candidate.locationLat,
    locationLng: candidate.locationLng,
  };
}

function renderCandidate(locale: Locale, candidate: CandidateEntry) {
  const t = getPageTranslator(locale);

  return `
    <article class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
      <label class="flex items-start gap-3">
        <input
          class="mt-1 size-5 accent-[var(--color-primary)]"
          data-trip-pois-ai-candidate-checkbox
          ${candidate.selected ? 'checked' : ''}
          ${candidate.saving ? 'disabled' : ''}
          type="checkbox"
          value="${escapeHtml(candidate.id)}"
        />
        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-start justify-between gap-3">
            <span class="flex min-w-0 items-center gap-3">
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white" style="background:${escapeHtml(candidate.color)};">
                ${escapeHtml(resolveTripPoiIcon(candidate.icon, candidate.type))}
              </span>
              <strong class="min-w-0 text-lg text-[var(--color-text)]">${escapeHtml(candidate.name)}</strong>
            </span>
            <span class="flex flex-wrap gap-2">
              <span class="status-pill" data-tone="primary">${escapeHtml(t(`tripPois.type.${candidate.type}`))}</span>
              <span class="status-pill" data-tone="${candidate.isVisible ? 'success' : 'warning'}">${escapeHtml(candidate.isVisible ? t('tripPois.visibility.visible') : t('tripPois.visibility.hidden'))}</span>
            </span>
          </span>
          <span class="mt-3 block text-sm text-[var(--color-text-muted)]">${escapeHtml(candidate.description || t('tripPoisAiPrompt.candidates.noDescription'))}</span>
          <span class="mt-4 block text-sm text-[var(--color-text-soft)]">
            <strong class="text-[var(--color-text)]">${escapeHtml(t('tripPoisAiPrompt.candidates.where'))}:</strong> ${escapeHtml(candidate.locationName)}
          </span>
        </span>
      </label>
    </article>
  `;
}

export function mountTripPoisAiPromptPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const promptOutput = document.querySelector<HTMLTextAreaElement>('[data-trip-pois-ai-prompt-output]');
  const promptCopyButton = document.querySelector<HTMLButtonElement>('[data-trip-pois-ai-prompt-copy]');
  const promptChatGptLink = document.querySelector<HTMLAnchorElement>('[data-trip-pois-ai-prompt-chatgpt]');
  const promptMessage = document.querySelector<HTMLElement>('[data-trip-pois-ai-prompt-message]');
  const importForm = document.querySelector<HTMLFormElement>('[data-trip-pois-ai-import-form]');
  const importMessage = document.querySelector<HTMLElement>('[data-trip-pois-ai-import-message]');
  const candidatesSection = document.querySelector<HTMLElement>('[data-trip-pois-ai-candidates-section]');
  const candidatesList = document.querySelector<HTMLElement>('[data-trip-pois-ai-candidates-list]');
  const candidatesCount = document.querySelector<HTMLElement>('[data-trip-pois-ai-candidates-count]');
  const candidatesActions = document.querySelector<HTMLElement>('[data-trip-pois-ai-candidates-actions]');
  const saveSelectedButton = document.querySelector<HTMLButtonElement>('[data-trip-pois-ai-save-selected]');
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let candidates: CandidateEntry[] = [];
  let hasParsedResults = false;
  const wizard = initTripPoisAiPromptWizard({ locale, onChange: () => updatePrompt() });

  if (!tripId || !promptOutput || !importForm || !candidatesList) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  function updatePrompt() {
    if (!currentTrip) {
      return;
    }

    const prompt = buildTripPoiAiPromptFromWizard(currentTrip, locale, wizard.getOptions());
    promptOutput.value = prompt;

    if (promptChatGptLink) {
      promptChatGptLink.href = getChatGptPromptUrl(prompt);
    }
  }

  const renderCandidates = () => {
    const count = candidates.length;
    const selectedCount = candidates.filter((candidate) => candidate.selected).length;

    if (candidatesCount) {
      candidatesCount.textContent = String(selectedCount || count);
      candidatesCount.dataset.tone = selectedCount > 0 ? 'primary' : 'warning';
    }

    if (candidatesActions) {
      candidatesActions.hidden = count === 0;
    }

    if (candidatesSection) {
      candidatesSection.hidden = !hasParsedResults;
    }

    candidatesList.innerHTML = count === 0
      ? `<div class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripPoisAiPrompt.candidates.empty'))}</div>`
      : candidates.map((candidate) => renderCandidate(locale, candidate)).join('');
  };

  const setCandidatesFromJson = (value: string) => {
    const parsed = parseTripPoiAiPromptJson(value);
    hasParsedResults = true;

    if (candidatesSection) {
      candidatesSection.hidden = false;
    }

    candidates = parsed.candidates.map((candidate) => ({
      ...candidate,
      id: getCandidateId(candidate),
      selected: true,
      saving: false,
    }));

    renderCandidates();

    if (parsed.errorKey) {
      setMessage(importMessage, t(parsed.errorKey), 'danger');
      return;
    }

    setMessage(importMessage, t('tripPoisAiPrompt.import.ready').replace('{count}', String(candidates.length)), 'success');
  };

  promptCopyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promptOutput.value);
      setMessage(promptMessage, t('tripPoisAiPrompt.prompt.copied'), 'success');
    } catch {
      promptOutput.focus();
      promptOutput.select();
      setMessage(promptMessage, t('tripPoisAiPrompt.prompt.copyFallback'), 'danger');
    }
  });

  importForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(importForm);
    setCandidatesFromJson(String(formData.get('json') ?? ''));
  });

  candidatesList.addEventListener('change', (event) => {
    const checkbox = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-trip-pois-ai-candidate-checkbox]');

    if (!checkbox) {
      return;
    }

    candidates = candidates.map((candidate) =>
      candidate.id === checkbox.value ? { ...candidate, selected: checkbox.checked } : candidate,
    );
    renderCandidates();
  });

  saveSelectedButton?.addEventListener('click', async () => {
    const selected = candidates.filter((candidate) => candidate.selected).map((candidate) => ({ ...candidate }));

    if (selected.length === 0) {
      setMessage(importMessage, t('tripPoisAiPrompt.candidates.noneSelected'), 'danger');
      return;
    }

    setButtonBusy(
      saveSelectedButton,
      true,
      t('tripPoisAiPrompt.candidates.saveSelected'),
      t('tripPoisAiPrompt.candidates.saving'),
    );

    try {
      const selectedIds = new Set(selected.map((candidate) => candidate.id));

      candidates = candidates.map((candidate) =>
        selectedIds.has(candidate.id) ? { ...candidate, saving: true } : candidate,
      );
      renderCandidates();

      const results = await Promise.allSettled(
        selected.map(async (candidate) => {
          await createTripPointOfInterest(tripId, toPoiInput(candidate));
          return candidate.id;
        }),
      );

      const savedIds = new Set(
        results
          .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
          .map((result) => result.value),
      );
      const failedCount = results.length - savedIds.size;

      candidates = candidates
        .filter((candidate) => !savedIds.has(candidate.id))
        .map((candidate) => ({ ...candidate, saving: false }));
      renderCandidates();

      if (failedCount === 0) {
        setMessage(importMessage, t('tripPoisAiPrompt.candidates.saved'), 'success');
        redirectTo(locale, 'trip-pois', { trip: tripId });
        return;
      } else if (savedIds.size > 0) {
        setMessage(
          importMessage,
          t('tripPoisAiPrompt.candidates.partialSaved')
            .replace('{saved}', String(savedIds.size))
            .replace('{failed}', String(failedCount)),
          'danger',
        );
      } else {
        setMessage(importMessage, t('tripPoisAiPrompt.candidates.saveError'), 'danger');
      }
    } catch (error) {
      setMessage(importMessage, error instanceof Error ? error.message : t('tripPoisAiPrompt.candidates.saveError'), 'danger');
    } finally {
      candidates = candidates.map((candidate) => ({ ...candidate, saving: false }));
      renderCandidates();
      setButtonBusy(
        saveSelectedButton,
        false,
        t('tripPoisAiPrompt.candidates.saveSelected'),
        t('tripPoisAiPrompt.candidates.saving'),
      );
    }
  });

  observeSession((user) => {
    currentTrip = null;

    if (!user) {
      redirectHome(locale);
      return;
    }

    void getTripOnce(tripId).then((trip) => {
      if (!trip) {
        setMessage(importMessage, t('trip.notFound'), 'danger');
        return;
      }

      currentTrip = trip;
      syncTripShell(locale, trip);
      wizard.syncTrip(trip);
      updatePrompt();
    });
  });

  renderCandidates();
}
