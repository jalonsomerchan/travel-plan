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

describe('trip AI prompt wizard', () => {
  it('keeps wizard files available', () => {
    [
      'src/lib/app/trip-ai-prompt-builder.ts',
      'src/lib/app/trip-ai-prompt-wizard.ts',
      'src/components/app/TripAiPromptBody.astro',
      'src/components/app/TripAiPromptWizard.astro',
      'src/scripts/pages/trip-ai-prompt-wizard.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('wires the wizard into the prompt page', () => {
    const page = readText('src/components/pages/TripAiPromptPage.astro');
    const body = readText('src/components/app/TripAiPromptBody.astro');
    const script = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(page, /TripAiPromptBody/);
    assert.match(body, /TripAiPromptWizard/);
    assert.match(script, /initTripAiPromptWizard/);
    assert.match(script, /buildTripAiPromptFromWizard/);
  });

  it('keeps wizard controls and prompt options explicit', () => {
    const wizard = readText('src/components/app/TripAiPromptWizard.astro');
    const builder = readText('src/lib/app/trip-ai-prompt-builder.ts');
    const controller = readText('src/scripts/pages/trip-ai-prompt-wizard.ts');

    ['dateMode', 'planMode', 'tourismStyle', 'budgetMode', 'accessMode'].forEach((name) => {
      assert.match(wizard, new RegExp(`name=\\"${name}\\"`));
    });
    assert.match(builder, /TripAiPromptWizardOptions/);
    assert.match(controller, /getOptions/);
    assert.match(controller, /syncTrip/);
  });

  it('forces saved wizard candidates to proposed status', () => {
    const models = readText('src/lib/app/models.ts');
    const script = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(models, /'proposed'/);
    assert.match(script, /status: 'proposed'/);
  });

  it('keeps wizard translations aligned', () => {
    const es = readJson('src/i18n/feature-translations/trip-ai-prompt/es.json');
    const en = readJson('src/i18n/feature-translations/trip-ai-prompt/en.json');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['status.plan.proposed'], 'Propuesto');
    assert.equal(en['status.plan.proposed'], 'Proposed');
    assert.ok(es['tripAiPrompt.wizard.place']);
    assert.ok(en['tripAiPrompt.wizard.accessMode']);
    assert.ok(es['tripAiPrompt.wizard.planModeItinerary']);
    assert.ok(en['tripAiPrompt.wizard.dateModeUnscheduled']);
  });
});
