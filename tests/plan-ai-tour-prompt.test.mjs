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

describe('plan AI tour prompt', () => {
  it('keeps the helper, page button and modal wiring available', () => {
    const page = readText('src/components/pages/PlanPage.astro');
    const script = readText('src/scripts/pages/plan.ts');

    assert.equal(existsSync(join(root, 'src/lib/app/plan-ai-tour-prompt.ts')), true);
    assert.match(page, /data-plan-ai-tour-open/);
    assert.match(page, /data-plan-ai-tour-modal/);
    assert.match(page, /name="planAiTourTone"/);
    assert.match(page, /name="planAiTourLength"/);
    assert.match(page, /name="planAiTourFocus"/);
    assert.match(script, /buildPlanAiTourPrompt/);
    assert.match(script, /data-plan-ai-tour-copy/);
    assert.match(script, /getChatGptPromptUrl/);
    assert.match(script, /showModal/);
  });

  it('keeps prompt options and translations aligned', () => {
    const helper = readText('src/lib/app/plan-ai-tour-prompt.ts');
    const es = readJson('src/i18n/translations/es.json');
    const en = readJson('src/i18n/translations/en.json');

    assert.match(helper, /planAiTourToneValues/);
    assert.match(helper, /planAiTourLengthValues/);
    assert.match(helper, /planAiTourFocusValues/);
    [
      'plan.aiTour.open',
      'plan.aiTour.tone.storyteller',
      'plan.aiTour.length.detailed',
      'plan.aiTour.focus.practical',
      'plan.aiTour.openChatGpt',
    ].forEach((key) => {
      assert.ok(es[key]);
      assert.ok(en[key]);
    });
  });
});
