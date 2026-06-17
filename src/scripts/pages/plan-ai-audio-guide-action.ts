import type { Locale } from '../../config/site';
import { generatePlanAudioGuide } from '../../lib/ai/plan-audio-guide';
import { AiClientError } from '../../lib/ai/errors';
import { escapeHtml, setButtonBusy, setMessage } from '../../lib/app/dom';
import type { PlanRecord, TripRecord } from '../../lib/app/models';
import { getFirebaseAuth } from '../../lib/firebase/config';
import { getTripPlansOnce, updatePlan } from '../../lib/firebase/plans';
import { getTripOnce } from '../../lib/firebase/trip-reads';
import { openPlanAiGuidePlayer } from './plan-ai-guide-player';
import { ensureFirebaseReady, getPageTranslator } from './shared';

let listActionsMounted = false;

function normalizeLocale(locale: string | undefined): Locale {
  return locale === 'en' ? 'en' : 'es';
}

function getCurrentTripAndPlanIds() {
  const params = new URL(window.location.href).searchParams;

  return {
    tripId: params.get('trip') ?? '',
    planId: params.get('plan') ?? '',
  };
}

function getErrorMessage(locale: Locale, error: unknown) {
  const t = getPageTranslator(locale);

  if (error instanceof AiClientError) {
    const messages: Record<string, string> = {
      disabled: t('ai.disabled'),
      'missing-config': t('ai.missingConfig'),
      'quota-exhausted': t('ai.quotaExhausted'),
      timeout: t('ai.error'),
      'invalid-response': t('ai.invalidResponse'),
      'request-failed': t('ai.error'),
    };

    return messages[error.code] ?? t('plan.aiAudioGuide.error');
  }

  return error instanceof Error ? error.message : t('plan.aiAudioGuide.error');
}

function getSignedInUser(locale: Locale) {
  if (!ensureFirebaseReady(locale)) {
    return null;
  }

  return getFirebaseAuth().currentUser;
}

async function getPlanContext(tripId: string, planId: string) {
  const [trip, plans] = await Promise.all([getTripOnce(tripId), getTripPlansOnce(tripId)]);
  const plan = plans.find((item) => item.id === planId) ?? null;

  return { trip, plan };
}

async function saveAndPlayGuide(locale: Locale, tripId: string, trip: TripRecord, plan: PlanRecord, aiGuide: string) {
  const nextPlan = { ...plan, aiGuide };
  await updatePlan(tripId, plan.id, nextPlan);
  openPlanAiGuidePlayer(locale, nextPlan, { autoPlay: true });
}

export function renderPlanAiAudioGuideMenuAction(locale: Locale, plan: PlanRecord) {
  const label = getPageTranslator(locale)('plan.aiAudioGuide.action');

  return `
    <button class="app-actions-menu-link app-actions-menu-button" data-plan-ai-audio-guide-action="${escapeHtml(plan.id)}" type="button">
      ${escapeHtml(label)}
    </button>`;
}

export async function generateAndPlayPlanAiAudioGuide(input: {
  locale: Locale;
  tripId: string;
  planId: string;
  button: HTMLButtonElement | null;
  messageTarget?: HTMLElement | null;
}) {
  const { locale, tripId, planId, button, messageTarget = null } = input;
  const t = getPageTranslator(locale);
  const idleLabel = t('plan.aiAudioGuide.action');
  const user = getSignedInUser(locale);

  if (!tripId || !planId) {
    setMessage(messageTarget, t('plan.missingId'), 'danger');
    if (!messageTarget) window.alert(t('plan.missingId'));
    return;
  }

  if (!user) {
    setMessage(messageTarget, t('plan.aiAudioGuide.authRequired'), 'danger');
    if (!messageTarget) window.alert(t('plan.aiAudioGuide.authRequired'));
    return;
  }

  setButtonBusy(button, true, idleLabel, t('plan.aiAudioGuide.generating'));
  setMessage(messageTarget, t('plan.aiAudioGuide.generating'), 'default');

  try {
    const { trip, plan } = await getPlanContext(tripId, planId);

    if (!trip) {
      throw new Error(t('plan.aiAudioGuide.tripNotFound'));
    }

    if (!plan) {
      throw new Error(t('plan.aiAudioGuide.planNotFound'));
    }

    const aiGuide = await generatePlanAudioGuide({ firebaseUser: user, locale, trip, plan });
    await saveAndPlayGuide(locale, tripId, trip, plan, aiGuide);
    setMessage(messageTarget, t('plan.aiAudioGuide.generated'), 'success');
  } catch (error) {
    const message = getErrorMessage(locale, error);
    setMessage(messageTarget, message, 'danger');
    if (!messageTarget) window.alert(message);
  } finally {
    setButtonBusy(button, false, idleLabel, t('plan.aiAudioGuide.generating'));
  }
}

export function mountPlanAiAudioGuidePageAction({ locale: inputLocale }: { locale: string }) {
  const locale = normalizeLocale(inputLocale);
  const button = document.querySelector<HTMLButtonElement>('[data-plan-ai-audio-guide-action]');
  const messageTarget = document.querySelector<HTMLElement>('[data-plan-ai-audio-guide-message]');

  button?.addEventListener('click', () => {
    const { tripId, planId } = getCurrentTripAndPlanIds();
    void generateAndPlayPlanAiAudioGuide({ locale, tripId, planId, button, messageTarget });
  });
}

export function mountPlanAiAudioGuideListActions() {
  if (listActionsMounted) {
    return;
  }

  listActionsMounted = true;

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-plan-ai-audio-guide-action]');

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const locale = normalizeLocale(document.documentElement.lang);
    const tripId = getCurrentTripAndPlanIds().tripId;
    const planId = button.dataset.planAiAudioGuideAction ?? '';

    void generateAndPlayPlanAiAudioGuide({ locale, tripId, planId, button });
  });
}
