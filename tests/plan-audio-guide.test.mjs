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

describe('plan AI audio guide', () => {
  it('keeps the authenticated audio guide modules available', () => {
    [
      'src/lib/ai/plan-audio-guide.ts',
      'src/scripts/pages/plan-ai-audio-guide-action.ts',
      'src/i18n/feature-translations/plan-audio-guide/es.json',
      'src/i18n/feature-translations/plan-audio-guide/en.json',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('registers aligned audio guide translations', () => {
    const ui = readText('src/i18n/ui.ts');
    const es = readJson('src/i18n/feature-translations/plan-audio-guide/es.json');
    const en = readJson('src/i18n/feature-translations/plan-audio-guide/en.json');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.match(ui, /feature-translations\/plan-audio-guide\/es\.json/);
    assert.match(ui, /feature-translations\/plan-audio-guide\/en\.json/);
    assert.equal(es['plan.aiAudioGuide.action'], 'IA-AudioGuía');
  });

  it('adds the audio guide action to plan list menus and plan detail', () => {
    const generator = readText('src/scripts/pages/plan-ai-tour-generator.ts');
    const planPage = readText('src/components/pages/PlanPage.astro');

    assert.match(generator, /renderPlanAiAudioGuideMenuAction/);
    assert.match(generator, /mountPlanAiAudioGuideListActions\(\)/);
    assert.match(planPage, /data-plan-ai-audio-guide-action/);
    assert.match(planPage, /mountPlanAiAudioGuidePageAction/);
  });

  it('keeps the audio guide prompt focused on narration', () => {
    const source = readText('src/lib/ai/plan-audio-guide.ts');

    assert.match(source, /history, context, legends, anecdotes/);
    assert.match(source, /Do not include logistics/);
    assert.match(source, /valid JSON with shape/);
  });

  it('uses the requested Mistral generation parameters for authenticated audio guide requests', () => {
    const client = readText('src/lib/ai/authenticated-api-client.ts');

    assert.match(client, /provider=mistral/);
    assert.match(client, /model=ministral-8b-2512/);
    assert.match(client, /maxOutputTokens/);
    assert.match(client, /8000/);
    assert.match(client, /temperature/);
    assert.match(client, /0\.8/);
  });
});
