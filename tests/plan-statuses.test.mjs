import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan statuses', () => {
  it('keeps the proposed status wired through models, translations and shared labels', () => {
    const models = readText('src/lib/app/models.ts');
    const shared = readText('src/scripts/pages/shared.ts');
    const es = readText('src/i18n/translations/es.json');
    const en = readText('src/i18n/translations/en.json');

    assert.match(models, /'proposed'/);
    assert.match(shared, /status === 'proposed'/);
    assert.match(es, /"status\.plan\.proposed": "Propuesto"/);
    assert.match(en, /"status\.plan\.proposed": "Proposed"/);
    assert.match(es, /"trip\.planCard\.statusTooltip": "Estado: \{status\}"/);
    assert.match(en, /"trip\.planCard\.statusTooltip": "Status: \{status\}"/);
  });

  it('renders the compact plan card actions for proposed, pending and completed states', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');

    assert.match(tripPage, /trip\.planCard\.markProposed/);
    assert.match(tripPage, /trip\.planCard\.markPending/);
    assert.match(tripPage, /trip\.planCard\.markVisited/);
    assert.match(tripPage, /data-plan-status-action/);
    assert.match(tripPage, /data-plan-delete-action/);
    assert.match(tripPage, /trip\.planCard\.type/);
    assert.match(tripPage, /trip\.planCard\.date/);
    assert.match(tripPage, /trip\.planCard\.distance/);
    assert.match(tripPage, /renderPlanStatusIndicator\(locale, plan\.status\)/);
    assert.match(tripPage, /trip\.planCard\.statusTooltip/);
  });

  it('keeps plan cards mobile-safe with long links in text', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');
    const flags = readText('src/lib/app/plan-flags.ts');

    assert.match(tripPage, /app-card-shell min-w-0 overflow-hidden/);
    assert.match(tripPage, /grid min-w-0 grid-cols-\[auto_minmax\(0,1fr\)_auto\] items-start gap-3/);
    assert.match(tripPage, /plan-category-dot mt-2/);
    assert.match(tripPage, /<h3 class="min-w-0 break-words text-lg font-bold leading-tight/);
    assert.match(tripPage, /<summary[^>]+>\s*⋮\s*<\/summary>/);
    assert.match(tripPage, /getPlanFlagsHtml\(plan, t\)/);
    assert.match(tripPage, /renderPlanAiGuideIndicator\(locale, plan\)/);
    assert.match(tripPage, /status-pill/);
    assert.match(tripPage, /max-w-full break-words text-sm text-\[var\(--color-text-muted\)\] \[overflow-wrap:anywhere\]/);
    assert.match(tripPage, /flex min-w-0 flex-wrap gap-x-4 gap-y-2/);
    assert.doesNotMatch(tripPage, /renderFirstPlanLink/);
    assert.doesNotMatch(tripPage, /getFirstPlanLink/);
    assert.match(flags, /flex min-w-0 flex-wrap items-center gap-2/);
    assert.match(flags, /inline-flex h-8 w-8 items-center justify-center rounded-full/);
    assert.match(flags, /title="\$\{labels\.paid\}"/);
    assert.doesNotMatch(flags, /truncate/);
  });

  it('makes the whole plan card clickable while preserving menu actions', () => {
    const tripPageComponent = readText('src/components/pages/TripPage.astro');

    assert.match(tripPageComponent, /\[data-plan-list\] \.app-card-shell/);
    assert.match(tripPageComponent, /cursor: pointer/);
    assert.match(tripPageComponent, /event\.target\.closest\('a, button, details, summary, input, select, textarea, label'\)/);
    assert.match(tripPageComponent, /event\.defaultPrevented/);
    assert.match(tripPageComponent, /window\.location\.href = link\.href/);
  });

  it('starts app breadcrumbs at dashboard when available', () => {
    const appShell = readText('src/components/app/AppShell.astro');

    assert.match(appShell, /shouldStartAtDashboard/);
    assert.match(appShell, /breadcrumbs\[1\]\?\.href\?\.endsWith\('\/app\/'\)/);
    assert.match(appShell, /breadcrumbs\.slice\(1\)/);
    assert.match(appShell, /visibleBreadcrumbs/);
  });

  it('shows and plays AI guides from the trip plan list', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');
    const player = readText('src/scripts/pages/plan-ai-guide-player.ts');

    assert.match(tripPage, /renderPlanAiGuideIndicator\(locale, plan\)/);
    assert.match(tripPage, /renderPlanAiGuideMenuAction\(locale, plan\)/);
    assert.match(tripPage, /data-plan-ai-guide-action/);
    assert.match(tripPage, /openPlanAiGuidePlayer\(locale, plan\)/);
    assert.match(tripPage, /stopPlanAiGuidePlayer\(\)/);
    assert.match(player, /data-plan-ai-guide-player-modal/);
    assert.match(player, /SpeechSynthesisUtterance/);
    assert.match(player, /plan\.aiGuide\.badge/);
    assert.match(player, /plan\.aiGuide\.play/);
    assert.match(player, /plan\.aiGuide\.stop/);
  });

  it('generates missing AI guides from the trip plan list with a reusable modal', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');
    const generator = readText('src/scripts/pages/plan-ai-tour-generator.ts');

    assert.match(tripPage, /renderPlanAiTourGenerateMenuAction\(locale, plan\)/);
    assert.match(tripPage, /data-plan-ai-tour-generate-action/);
    assert.match(tripPage, /openPlanAiTourGenerator\(locale, currentTrip, plan/);
    assert.match(tripPage, /await updatePlan\(tripId, plan\.id, \{ \.\.\.plan, aiGuide \}\)/);
    assert.match(generator, /buildPlanAiTourPrompt/);
    assert.match(generator, /normalizeAiGuideText/);
    assert.match(generator, /travelPlan:planAiTourOptions/);
    assert.match(generator, /data-plan-ai-tour-generator-output/);
    assert.match(generator, /data-plan-ai-tour-generator-save/);
    assert.match(generator, /renderPlanAiTourGenerateMenuAction/);
  });
});
