import type { Locale } from '../../config/site';
import type { PlanRecord } from '../../lib/app/models';
import { escapeHtml } from '../../lib/app/dom';
import { getPageTranslator } from './shared';

export function hasPlanAiGuide(plan: PlanRecord) {
  return Boolean(plan.aiGuide?.trim());
}

export function renderPlanAiGuideIndicator(locale: Locale, plan: PlanRecord) {
  if (!hasPlanAiGuide(plan)) {
    return '';
  }

  const label = getPageTranslator(locale)('plan.aiGuide.badge');

  return `<span aria-label="${escapeHtml(label)}" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-sm" role="img" title="${escapeHtml(label)}">♪</span>`;
}

export function renderPlanAiGuideMenuAction(locale: Locale, plan: PlanRecord) {
  if (!hasPlanAiGuide(plan)) {
    return '';
  }

  return `
    <button class="app-actions-menu-link app-actions-menu-button" data-plan-ai-guide-action="${escapeHtml(plan.id)}" type="button">
      ${escapeHtml(getPageTranslator(locale)('plan.aiGuide.play'))}
    </button>`;
}

function stopPlanAiGuideSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function playPlanAiGuideSpeech(text: string, locale: Locale) {
  stopPlanAiGuideSpeech();

  if (!('speechSynthesis' in window)) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale === 'es' ? 'es-ES' : 'en-US';
  window.speechSynthesis.speak(utterance);
  return true;
}

function ensurePlanAiGuideModal(locale: Locale) {
  const existing = document.querySelector<HTMLDialogElement>('[data-plan-ai-guide-player-modal]');

  if (existing) {
    return existing;
  }

  const t = getPageTranslator(locale);
  const modal = document.createElement('dialog');
  modal.className =
    'w-[min(100%-1.5rem,42rem)] max-w-none overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0 text-[var(--color-text)] shadow-[var(--shadow-lg)]';
  modal.dataset.planAiGuidePlayerModal = 'true';
  modal.innerHTML = `
    <div class="max-h-[min(88vh,42rem)] overflow-y-auto p-4 md:p-6">
      <div class="relative space-y-5">
        <button aria-label="${escapeHtml(t('plan.aiTour.closeLabel'))}" class="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-xl font-bold text-[var(--color-text)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--color-surface)]" data-plan-ai-guide-player-close type="button">
          <span aria-hidden="true">×</span>
        </button>
        <div class="pr-14">
          <span class="eyebrow">${escapeHtml(t('plan.aiGuide.badge'))}</span>
          <h2 class="mt-3 text-2xl font-black text-[var(--color-text)]" data-plan-ai-guide-player-title>${escapeHtml(t('plan.aiGuide.title'))}</h2>
          <p class="mt-2 text-sm text-[var(--color-text-soft)]">${escapeHtml(t('plan.aiGuide.helper'))}</p>
        </div>
        <div class="max-h-72 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm leading-relaxed text-[var(--color-text-muted)]" data-plan-ai-guide-player-text></div>
        <div class="flex flex-wrap gap-3">
          <button class="app-card-link" data-plan-ai-guide-player-play data-variant="primary" type="button">${escapeHtml(t('plan.aiGuide.play'))}</button>
          <button class="app-card-link" data-plan-ai-guide-player-stop data-variant="secondary" type="button">${escapeHtml(t('plan.aiGuide.stop'))}</button>
        </div>
        <p class="text-sm text-[var(--color-text-soft)]" data-plan-ai-guide-player-message></p>
      </div>
    </div>
  `;

  modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-close]')?.addEventListener('click', () => {
    stopPlanAiGuideSpeech();
    modal.close();
  });
  modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-stop]')?.addEventListener('click', () => {
    stopPlanAiGuideSpeech();
    const message = modal.querySelector<HTMLElement>('[data-plan-ai-guide-player-message]');
    if (message) message.textContent = t('plan.aiGuide.stopped');
  });
  modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-play]')?.addEventListener('click', () => {
    const supported = playPlanAiGuideSpeech(modal.dataset.aiGuideText ?? '', locale);
    const message = modal.querySelector<HTMLElement>('[data-plan-ai-guide-player-message]');
    if (message) message.textContent = supported ? t('plan.aiGuide.playing') : t('plan.aiGuide.unsupported');
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      stopPlanAiGuideSpeech();
      modal.close();
    }
  });
  modal.addEventListener('close', stopPlanAiGuideSpeech);
  document.body.append(modal);
  return modal;
}

export function openPlanAiGuidePlayer(locale: Locale, plan: PlanRecord, options: { autoPlay?: boolean } = {}) {
  const aiGuide = plan.aiGuide?.trim();

  if (!aiGuide) {
    return;
  }

  const modal = ensurePlanAiGuideModal(locale);
  const title = modal.querySelector<HTMLElement>('[data-plan-ai-guide-player-title]');
  const text = modal.querySelector<HTMLElement>('[data-plan-ai-guide-player-text]');
  const message = modal.querySelector<HTMLElement>('[data-plan-ai-guide-player-message]');
  modal.dataset.aiGuideText = aiGuide;
  if (title) title.textContent = plan.name;
  if (text) text.textContent = aiGuide;
  if (message) message.textContent = '';

  if (!modal.open) {
    modal.showModal();
  }

  if (options.autoPlay) {
    modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-play]')?.click();
    modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-stop]')?.focus();
    return;
  }

  modal.querySelector<HTMLButtonElement>('[data-plan-ai-guide-player-play]')?.focus();
}

export function stopPlanAiGuidePlayer() {
  stopPlanAiGuideSpeech();
}
