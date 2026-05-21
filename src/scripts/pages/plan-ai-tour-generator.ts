import type { Locale } from '../../config/site';
import { normalizeAiGuideText } from '../../lib/app/ai-guide-text';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { buildPlanAiTourPrompt } from '../../lib/app/plan-ai-tour-prompt';
import { getChatGptPromptUrl } from '../../lib/app/trip-ai-prompt';
import { escapeHtml } from '../../lib/app/dom';
import { getPageTranslator } from './shared';

const storageKey = 'travelPlan:planAiTourOptions';
const optionNames = ['planAiTourTone', 'planAiTourLength', 'planAiTourFocus'] as const;
type OptionName = (typeof optionNames)[number];

const allowedOptions: Record<OptionName, readonly string[]> = {
  planAiTourTone: ['serious', 'fun', 'storyteller'],
  planAiTourLength: ['short', 'standard', 'detailed'],
  planAiTourFocus: ['history', 'practical', 'mixed'],
};

function getGenerateGuideLabel(locale: Locale) {
  return locale === 'es' ? 'Generar guía' : 'Generate guide';
}

export function renderPlanAiTourGenerateMenuAction(locale: Locale, plan: PlanRecord) {
  if (plan.aiGuide?.trim()) return '';

  return `
    <button class="app-actions-menu-link app-actions-menu-button" data-plan-ai-tour-generate-action="${escapeHtml(plan.id)}" type="button">
      ${escapeHtml(getGenerateGuideLabel(locale))}
    </button>`;
}

function getChecked(modal: HTMLDialogElement, name: OptionName, fallback: string) {
  return modal.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? fallback;
}

function restoreOptions(modal: HTMLDialogElement) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
    optionNames.forEach((name) => {
      const value = stored[name];
      if (typeof value !== 'string' || !allowedOptions[name].includes(value)) return;
      const input = modal.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    });
  } catch {
    // The generator keeps working if localStorage is blocked or contains invalid data.
  }
}

function saveOptions(modal: HTMLDialogElement) {
  const options: Partial<Record<OptionName, string>> = {};
  optionNames.forEach((name) => {
    options[name] = getChecked(modal, name, '');
  });

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(options));
  } catch {
    // The generator keeps working if localStorage is blocked.
  }
}

function getPrompt(locale: Locale, trip: TripRecord, plan: PlanRecord, modal: HTMLDialogElement) {
  const t = getPageTranslator(locale);
  const prompt = buildPlanAiTourPrompt(trip, plan, locale, {
    tone: getChecked(modal, 'planAiTourTone', 'serious') as 'serious' | 'fun' | 'storyteller',
    length: getChecked(modal, 'planAiTourLength', 'standard') as 'short' | 'standard' | 'detailed',
    focus: getChecked(modal, 'planAiTourFocus', 'mixed') as 'history' | 'practical' | 'mixed',
  });

  return `${prompt}\n\n${t('plan.aiTour.plainNarrationInstruction')}`;
}

function buildModalHtml(locale: Locale) {
  const t = getPageTranslator(locale);
  const generateGuideLabel = getGenerateGuideLabel(locale);

  return `
    <div class="max-h-[min(88vh,56rem)] overflow-y-auto p-4 md:p-6">
      <div class="relative space-y-5">
        <button aria-label="${escapeHtml(t('plan.aiTour.closeLabel'))}" class="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-xl font-bold text-[var(--color-text)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--color-surface)]" data-plan-ai-tour-generator-close type="button">
          <span aria-hidden="true">×</span>
        </button>
        <div class="pr-14">
          <span class="eyebrow">${escapeHtml(generateGuideLabel)}</span>
          <h2 class="mt-3 text-2xl font-black text-[var(--color-text)]">${escapeHtml(t('plan.aiTour.title'))}</h2>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('plan.aiTour.helper'))}</p>
        </div>
        <div class="grid gap-4 xl:grid-cols-3">
          <fieldset class="space-y-3">
            <legend class="field-label">${escapeHtml(t('plan.aiTour.tone'))}</legend>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input checked name="planAiTourTone" type="radio" value="serious" /><span>${escapeHtml(t('plan.aiTour.tone.serious'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourTone" type="radio" value="fun" /><span>${escapeHtml(t('plan.aiTour.tone.fun'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourTone" type="radio" value="storyteller" /><span>${escapeHtml(t('plan.aiTour.tone.storyteller'))}</span></label>
          </fieldset>
          <fieldset class="space-y-3">
            <legend class="field-label">${escapeHtml(t('plan.aiTour.length'))}</legend>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input checked name="planAiTourLength" type="radio" value="standard" /><span>${escapeHtml(t('plan.aiTour.length.standard'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourLength" type="radio" value="short" /><span>${escapeHtml(t('plan.aiTour.length.short'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourLength" type="radio" value="detailed" /><span>${escapeHtml(t('plan.aiTour.length.detailed'))}</span></label>
          </fieldset>
          <fieldset class="space-y-3">
            <legend class="field-label">${escapeHtml(t('plan.aiTour.focus'))}</legend>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input checked name="planAiTourFocus" type="radio" value="mixed" /><span>${escapeHtml(t('plan.aiTour.focus.mixed'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourFocus" type="radio" value="history" /><span>${escapeHtml(t('plan.aiTour.focus.history'))}</span></label>
            <label class="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm"><input name="planAiTourFocus" type="radio" value="practical" /><span>${escapeHtml(t('plan.aiTour.focus.practical'))}</span></label>
          </fieldset>
        </div>
        <div>
          <label class="field-label" for="plan-ai-tour-generator-output">${escapeHtml(t('plan.aiTour.promptLabel'))}</label>
          <textarea class="field-textarea min-h-72 font-mono text-xs leading-relaxed" data-plan-ai-tour-generator-output id="plan-ai-tour-generator-output" readonly spellcheck="false"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button class="app-card-link" data-plan-ai-tour-generator-copy data-variant="primary" type="button">${escapeHtml(t('plan.aiTour.copy'))}</button>
          <a class="app-card-link" data-plan-ai-tour-generator-chatgpt data-variant="secondary" href="https://chatgpt.com/" rel="noopener noreferrer" target="_blank">${escapeHtml(t('plan.aiTour.openChatGpt'))}</a>
        </div>
        <p class="text-sm text-[var(--color-text-soft)]" data-plan-ai-tour-generator-message>${escapeHtml(t('plan.aiTour.copyHelper'))}</p>
        <div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
          <label class="field-label" for="plan-ai-tour-generator-result">${escapeHtml(t('plan.aiTour.resultLabel'))}</label>
          <p class="mb-3 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('plan.aiTour.resultHelper'))}</p>
          <textarea class="field-textarea min-h-48 text-sm leading-relaxed" data-plan-ai-tour-generator-result id="plan-ai-tour-generator-result" placeholder="${escapeHtml(t('plan.aiTour.resultPlaceholder'))}" spellcheck="true"></textarea>
          <div class="mt-4 flex flex-wrap gap-3"><button class="app-card-link" data-plan-ai-tour-generator-save data-variant="primary" type="button">${escapeHtml(t('plan.aiTour.saveGuide'))}</button></div>
          <p class="mt-3 text-sm text-[var(--color-text-soft)]" data-plan-ai-tour-generator-save-message>${escapeHtml(t('plan.aiTour.saveHelper'))}</p>
        </div>
      </div>
    </div>`;
}

export function openPlanAiTourGenerator(
  locale: Locale,
  trip: TripRecord,
  plan: PlanRecord,
  onSave: (aiGuide: string) => Promise<void>,
) {
  const t = getPageTranslator(locale);
  const modal = document.createElement('dialog');
  modal.className =
    'w-[min(100%-1.5rem,56rem)] max-w-none overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 text-[var(--color-text)] shadow-[var(--shadow-lg)]';
  modal.innerHTML = buildModalHtml(locale);
  document.body.append(modal);

  const output = modal.querySelector<HTMLTextAreaElement>('[data-plan-ai-tour-generator-output]');
  const chatGptLink = modal.querySelector<HTMLAnchorElement>('[data-plan-ai-tour-generator-chatgpt]');
  const result = modal.querySelector<HTMLTextAreaElement>('[data-plan-ai-tour-generator-result]');
  const saveButton = modal.querySelector<HTMLButtonElement>('[data-plan-ai-tour-generator-save]');
  const saveMessage = modal.querySelector<HTMLElement>('[data-plan-ai-tour-generator-save-message]');
  const copyMessage = modal.querySelector<HTMLElement>('[data-plan-ai-tour-generator-message]');

  const syncPrompt = () => {
    const prompt = getPrompt(locale, trip, plan, modal);
    if (output) output.value = prompt;
    if (chatGptLink) chatGptLink.href = getChatGptPromptUrl(prompt);
  };

  restoreOptions(modal);
  syncPrompt();

  modal.addEventListener('change', () => {
    saveOptions(modal);
    syncPrompt();
  });
  modal.querySelector<HTMLButtonElement>('[data-plan-ai-tour-generator-close]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener('close', () => modal.remove(), { once: true });
  modal.querySelector<HTMLButtonElement>('[data-plan-ai-tour-generator-copy]')?.addEventListener('click', async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.value);
      setMessage(copyMessage, t('plan.aiTour.copied'), 'success');
    } catch {
      output.focus();
      output.select();
      setMessage(copyMessage, t('plan.aiTour.copyFallback'), 'danger');
    }
  });
  saveButton?.addEventListener('click', async () => {
    if (!result) return;
    const aiGuide = normalizeAiGuideText(result.value);

    if (!aiGuide) {
      setMessage(saveMessage, t('plan.aiTour.saveEmpty'), 'danger');
      result.focus();
      return;
    }

    result.value = aiGuide;
    setButtonBusy(saveButton, true, t('plan.aiTour.saveGuide'), t('common.saving'));
    try {
      await onSave(aiGuide);
      modal.close();
    } catch (error) {
      setMessage(saveMessage, error instanceof Error ? error.message : t('plan.aiTour.saveError'), 'danger');
    } finally {
      setButtonBusy(saveButton, false, t('plan.aiTour.saveGuide'), t('common.saving'));
    }
  });

  modal.showModal();
}
