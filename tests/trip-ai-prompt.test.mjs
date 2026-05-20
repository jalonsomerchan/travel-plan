import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

describe('trip AI prompt tool', () => {
  it('keeps the route, page, script and helper available', () => {
    [
      'src/lib/app/trip-ai-prompt.ts',
      'src/components/pages/TripAiPromptPage.astro',
      'src/scripts/pages/trip-ai-prompt.ts',
      'src/pages/app/trip-ai-prompt/index.astro',
      'src/pages/[locale]/app/trip-ai-prompt/index.astro',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('registers the route and trip actions menu entry', () => {
    const routes = readText('src/lib/app/routes.ts');
    const menu = readText('src/components/app/TripActionsMenu.astro');
    const shared = readText('src/scripts/pages/shared.ts');

    assert.match(routes, /'trip-ai-prompt'/);
    assert.match(routes, /app\/trip-ai-prompt/);
    assert.match(menu, /trip-ai-prompt-link/);
    assert.match(menu, /trip\.goAiPrompt/);
    assert.match(shared, /trip-ai-prompt-link/);
    assert.match(shared, /getAppUrl\(locale, 'trip-ai-prompt'/);
  });

  it('keeps prompt parsing and external prompt link helpers available', () => {
    const helper = readText('src/lib/app/trip-ai-prompt.ts');
    const pageScript = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(helper, /buildTripAiPrompt/);
    assert.match(helper, /getChatGptPromptUrl/);
    assert.match(helper, /parseTripAiPromptJson/);
    assert.match(helper, /JSON\.parse/);
    assert.match(helper, /normalizePlanLinks/);
    assert.match(pageScript, /createPlan/);
    assert.match(pageScript, /data-trip-ai-candidate-checkbox/);
  });

  it('keeps AI prompt candidate badges and title cleanup in place', () => {
    const helper = readText('src/lib/app/trip-ai-prompt.ts');
    const pageScript = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(helper, /cleanPlanName/);
    assert.match(helper, /getDescriptionWithTitleSources/);
    assert.match(helper, /urlLikePattern/);
    assert.match(helper, /never in name/);
    assert.match(helper, /sin enlaces/);
    assert.match(pageScript, /getPaymentLabel/);
    assert.match(pageScript, /tripAi\.budget\.free/);
    assert.match(pageScript, /candidate\.isPaid \? 'warning' : 'success'/);
  });

  it('keeps feature translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/trip-ai-prompt/es.json');
    const en = readJson('src/i18n/feature-translations/trip-ai-prompt/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['trip.goAiPrompt'], 'Promp IA');
    assert.ok(en['tripAiPrompt.import.ready']);
    assert.match(ui, /feature-translations\/trip-ai-prompt\/es\.json/);
    assert.match(ui, /feature-translations\/trip-ai-prompt\/en\.json/);
  });
});
