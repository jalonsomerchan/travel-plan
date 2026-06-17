import type { Locale } from '../../config/site';
import type { PlanRecord } from '../../lib/app/models';
import { escapeHtml } from '../../lib/app/dom';
import { getPageTranslator } from './shared';

export function renderPlanAiAudioGuideMenuAction(locale: Locale, plan: PlanRecord) {
  return `
    <button class="app-actions-menu-link app-actions-menu-button" data-plan-ai-audio-guide-action="${escapeHtml(plan.id)}" type="button">
      ${escapeHtml(getPageTranslator(locale)('plan.aiAudioGuide.action'))}
    </button>`;
}

export function mountPlanAiAudioGuidePageAction(_input: { locale: string }) {}
export function mountPlanAiAudioGuideListActions() {}
