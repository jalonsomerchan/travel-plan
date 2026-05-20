import type { Locale } from '../../config/site';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import { formatPlanMoment } from '../../lib/app/format';
import type { PlanInput, PlanRecord, TripRecord } from '../../lib/app/models';
import {
  buildTripAiPrompt,
  getChatGptPromptUrl,
  parseTripAiPromptJson,
  type TripAiPromptCandidate,
} from '../../lib/app/trip-ai-prompt';
import { createPlan, subscribeTripPlans } from '../../lib/firebase/plans';
import { observeSession } from '../../lib/firebase/session';
import { subscribeTrip } from '../../lib/firebase/trips';
import {
  ensureFirebaseReady,
  getCategoryLabel,
  getPageTranslator,
  redirectHome,
  syncTripNavigation,
  syncTripShell,
} from './shared';

interface CandidateEntry extends TripAiPromptCandidate {
  id: string;
  selected: boolean;
  saving: boolean;
}

function getCandidateId(candidate: TripAiPromptCandidate) {
  return `candidate-${candidate.sourceIndex}-${candidate.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
}

function toPlanInput(candidate: CandidateEntry): PlanInput {
  return {
    name: candidate.name,
    description: candidate.description,
    category: candidate.category,
    isPaid: candidate.isPaid,
    isBooked: candidate.isBooked,
    isOptional: candidate.isOptional,
    isImportant: candidate.isImportant,
    locationName: candidate.locationName,
    locationLat: candidate.locationLat,
    locationLng: candidate.locationLng,
    date: candidate.date,
    time: candidate.time,
    status: candidate.status,
    links: candidate.links,
  };
}

function renderCandidate(locale: Locale, candidate: CandidateEntry) {
  const t = getPageTranslator(locale);
  const moment = formatPlanMoment(candidate, locale) || t('calendar.unscheduled');
  const location = candidate.locationName || t('tripAiPrompt.candidates.noLocation');

  return `
    <article class="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
      <label class="flex items-start gap-3">
        <input
          class="mt-1 size-5 accent-[var(--color-primary)]"
          data-trip-ai-candidate-checkbox
          ${candidate.selected ? 'checked' : ''}
          ${candidate.saving ? 'disabled' : ''}
          type="checkbox"
          value="${escapeHtml(candidate.id)}"
        />
        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-start justify-between gap-3">
            <strong class="text-lg text-[var(--color-text)]">${escapeHtml(candidate.name)}</strong>
            <span class="status-pill" data-tone="primary">${escapeHtml(getCategoryLabel(locale, candidate.category))}</span>
          </span>
          <span class="mt-3 block text-sm text-[var(--color-text-muted)]">${escapeHtml(candidate.description || t('plan.descriptionEmpty'))}</span>
          <span class="mt-4 grid gap-2 text-sm text-[var(--color-text-soft)]">
            <span><strong class="text-[var(--color-text)]">${escapeHtml(t('tripAiPrompt.candidates.when'))}:</strong> ${escapeHtml(moment)}</span>
            <span><strong class="text-[var(--color-text)]">${escapeHtml(t('tripAiPrompt.candidates.where'))}:</strong> ${escapeHtml(location)}</span>
          </span>
        </span>
      </label>
    </article>
  `;
}

export function mountTripAiPromptPage({ locale }: { locale: Locale }) {
  const tripId = new URL(window.location.href).searchParams.get('trip') ?? '';
  const promptOutput = document.querySelector<HTMLTextAreaElement>('[data-trip-ai-prompt-output]');
  const promptCopyButton = document.querySelector<HTMLButtonElement>('[data-trip-ai-prompt-copy]');
  const promptChatGptLink = document.querySelector<HTMLAnchorElement>('[data-trip-ai-prompt-chatgpt]');
  const promptMessage = document.querySelector<HTMLElement>('[data-trip-ai-prompt-message]');
  const importForm = document.querySelector<HTMLFormElement>('[data-trip-ai-import-form]');
  const importMessage = document.querySelector<HTMLElement>('[data-trip-ai-import-message]');
  const candidatesList = document.querySelector<HTMLElement>('[data-trip-ai-candidates-list]');
  const candidatesCount = document.querySelector<HTMLElement>('[data-trip-ai-candidates-count]');
  const candidatesActions = document.querySelector<HTMLElement>('[data-trip-ai-candidates-actions]');
  const saveSelectedButton = document.querySelector<HTMLButtonElement>('[data-trip-ai-save-selected]');
  const t = getPageTranslator(locale);
  let currentTrip: TripRecord | null = null;
  let currentPlans: PlanRecord[] = [];
  let candidates: CandidateEntry[] = [];

  if (!tripId || !promptOutput || !importForm || !candidatesList) {
    return;
  }

  if (!ensureFirebaseReady(locale)) {
    return;
  }

  syncTripNavigation(locale, tripId);

  const updatePrompt = () => {
    if (!currentTrip) {
      return;
    }

    const prompt = buildTripAiPrompt(currentTrip, currentPlans, locale);
    promptOutput.value = prompt;

    if (promptChatGptLink) {
      promptChatGptLink.href = getChatGptPromptUrl(prompt);
    }
  };

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

    candidatesList.innerHTML = count === 0
      ? `<div class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('tripAiPrompt.candidates.empty'))}</div>`
      : candidates.map((candidate) => renderCandidate(locale, candidate)).join('');
  };

  const setCandidatesFromJson = (value: string) => {
    const parsed = parseTripAiPromptJson(value);

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

    setMessage(
      importMessage,
      t('tripAiPrompt.import.ready').replace('{count}', String(candidates.length)),
      'success',
    );
  };

  promptCopyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promptOutput.value);
      setMessage(promptMessage, t('tripAiPrompt.prompt.copied'), 'success');
    } catch {
      promptOutput.focus();
      promptOutput.select();
      setMessage(promptMessage, t('tripAiPrompt.prompt.copyFallback'), 'danger');
    }
  });

  importForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(importForm);
    setCandidatesFromJson(String(formData.get('json') ?? ''));
  });

  candidatesList.addEventListener('change', (event) => {
    const checkbox = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-trip-ai-candidate-checkbox]');

    if (!checkbox) {
      return;
    }

    candidates = candidates.map((candidate) =>
      candidate.id === checkbox.value ? { ...candidate, selected: checkbox.checked } : candidate,
    );
    renderCandidates();
  });

  saveSelectedButton?.addEventListener('click', async () => {
    const selected = candidates.filter((candidate) => candidate.selected);

    if (selected.length === 0) {
      setMessage(importMessage, t('tripAiPrompt.candidates.noneSelected'), 'danger');
      return;
    }

    setButtonBusy(
      saveSelectedButton,
      true,
      t('tripAiPrompt.candidates.saveSelected'),
      t('tripAiPrompt.candidates.saving'),
    );

    try {
      for (const candidate of selected) {
        candidate.saving = true;
        renderCandidates();
        await createPlan(tripId, toPlanInput(candidate));
      }

      candidates = candidates.filter((candidate) => !candidate.selected);
      renderCandidates();
      setMessage(importMessage, t('tripAiPrompt.candidates.saved'), 'success');
    } catch (error) {
      setMessage(
        importMessage,
        error instanceof Error ? error.message : t('tripAiPrompt.candidates.saveError'),
        'danger',
      );
    } finally {
      candidates = candidates.map((candidate) => ({ ...candidate, saving: false }));
      renderCandidates();
      setButtonBusy(
        saveSelectedButton,
        false,
        t('tripAiPrompt.candidates.saveSelected'),
        t('tripAiPrompt.candidates.saving'),
      );
    }
  });

  observeSession((user) => {
    if (!user) {
      redirectHome(locale);
      return;
    }

    subscribeTrip(tripId, (trip) => {
      currentTrip = trip;

      if (!trip) {
        setMessage(importMessage, t('trip.notFound'), 'danger');
        return;
      }

      syncTripShell(locale, trip);
      updatePrompt();
    });

    subscribeTripPlans(tripId, (plans) => {
      currentPlans = plans;
      updatePrompt();
    });
  });

  renderCandidates();
}
