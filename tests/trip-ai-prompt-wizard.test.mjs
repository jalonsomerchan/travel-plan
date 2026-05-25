import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function loadNormalizeAiGuideText() {
  const source = readText('src/lib/app/ai-guide-text.ts')
    .replace('export function normalizeAiGuideText(value: string)', 'function normalizeAiGuideText(value)')
    .concat('\nnormalizeAiGuideText;');

  return vm.runInNewContext(source);
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

    ['dateMode', 'scheduleMode', 'budgetMode', 'bookingMode', 'accessMode', 'types'].forEach((name) => {
      assert.match(wizard, new RegExp(`name=\\"${name}\\"`));
    });
    assert.match(controller, /selectedDates/);
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

  it('keeps AI guides generated from plan detail instead of trip prompt imports', () => {
    const models = readText('src/lib/app/models.ts');
    const prompt = readText('src/lib/app/trip-ai-prompt.ts');
    const plans = readText('src/lib/firebase/plans.ts');
    const promptScript = readText('src/scripts/pages/trip-ai-prompt.ts');
    const planPage = readText('src/components/pages/PlanPage.astro');
    const planScript = readText('src/scripts/pages/plan.ts');
    const editScript = readText('src/scripts/pages/plan-edit.ts');

    assert.match(models, /aiGuide\?: string/);
    assert.match(prompt, /Do not include aiGuide/);
    assert.doesNotMatch(prompt, /aiGuide: getString\(record/);
    assert.match(plans, /aiGuide/);
    assert.doesNotMatch(promptScript, /aiGuide: candidate\.aiGuide/);
    assert.match(planPage, /data-plan-ai-guide-section/);
    assert.match(planScript, /speechSynthesis/);
    assert.match(planScript, /SpeechSynthesisUtterance/);
    assert.match(editScript, /planInput\.aiGuide = currentPlan\.aiGuide/);
  });

  it('lets users paste and save an AI tour result from the plan modal', () => {
    const planPage = readText('src/components/pages/PlanPage.astro');
    const planScript = readText('src/scripts/pages/plan.ts');

    assert.match(planPage, /data-plan-ai-tour-result/);
    assert.match(planPage, /data-plan-ai-tour-save-guide/);
    assert.match(planPage, /plan\.aiTour\.resultLabel/);
    assert.match(planScript, /aiTourResultInput/);
    assert.match(planScript, /aiTourSaveGuideButton/);
    assert.match(planScript, /normalizeAiGuideText\(aiTourResultInput\.value\)/);
    assert.match(planScript, /aiTourResultInput\.value = aiGuide/);
    assert.match(planScript, /await updatePlan\(tripId, planId, \{ \.\.\.currentPlan, aiGuide \}\)/);
    assert.match(planScript, /currentAiGuide = aiGuide/);
    assert.match(planScript, /renderCurrentAiGuide\(\)/);
    assert.match(planScript, /aiTourModal\?\.close\(\)/);
    assert.match(planScript, /setMessage\(aiGuideMessage, t\('plan\.aiTour\.savedGuide'\), 'success'\)/);
  });

  it('uses the final plain narration instruction in the plan AI tour prompt', () => {
    const planScript = readText('src/scripts/pages/plan.ts');
    const promptBuilder = readText('src/lib/app/plan-ai-tour-prompt.ts');

    assert.match(promptBuilder, /continuous plain-text narration/);
    assert.match(promptBuilder, /narración continua en texto plano/);
    assert.match(promptBuilder, /Do not use titles, headings, sections, lists, tables, quotes, notes, sources, footnotes, bullet-point notes or Markdown formatting/);
    assert.match(promptBuilder, /No uses títulos, encabezados, secciones, listas, tablas, citas, notas, fuentes, notas al pie, apuntes ni formato Markdown/);
    assert.match(planScript, /plan\.aiTour\.plainNarrationInstruction/);
    assert.match(planScript, /const finalPrompt = `\$\{prompt\}\\n\\n\$\{t\('plan\.aiTour\.plainNarrationInstruction'\)\}`/);
    assert.match(planScript, /aiTourOutput\.value = finalPrompt/);
    assert.match(planScript, /getChatGptPromptUrl\(finalPrompt\)/);
  });

  it('remembers plan AI tour prompt options locally', () => {
    const planScript = readText('src/scripts/pages/plan.ts');

    assert.match(planScript, /travelPlan:planAiTourOptions/);
    assert.match(planScript, /window\.localStorage\.getItem\(aiTourOptionsStorageKey\)/);
    assert.match(planScript, /window\.localStorage\.setItem\(aiTourOptionsStorageKey, JSON\.stringify\(options\)\)/);
    assert.match(planScript, /restoreAiTourOptions\(aiTourModal\)/);
    assert.match(planScript, /saveAiTourOptions\(aiTourModal\)/);
    assert.match(planScript, /aiTourAllowedOptions\[name\]\.includes\(value\)/);
  });

  it('normalizes basic Markdown from saved AI guide text', () => {
    const normalizeAiGuideText = loadNormalizeAiGuideText();
    const input = `# Catedral

**Bienvenido** a este lugar.

- Mira los vitrales.

[Web oficial](https://example.com)`;

    assert.equal(
      normalizeAiGuideText(input),
      'Catedral\n\nBienvenido a este lugar.\n\nMira los vitrales.\n\nWeb oficial',
    );
  });

  it('keeps wizard translations aligned', () => {
    const es = readJson('src/i18n/feature-translations/trip-ai-prompt/es.json');
    const en = readJson('src/i18n/feature-translations/trip-ai-prompt/en.json');
    const models = readText('src/lib/app/models.ts');
    const wizardConfig = readText('src/lib/app/trip-ai-prompt-wizard.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['status.plan.proposed'], 'Propuesto');
    assert.equal(en['status.plan.proposed'], 'Proposed');
    assert.match(models, /'viewpoint'/);
    assert.match(wizardConfig, /'viewpoints'/);
    assert.equal(es['tripAiPrompt.wizard.type.viewpoints'], 'Miradores y vistas panorámicas');
    assert.equal(en['tripAiPrompt.wizard.type.viewpoints'], 'Viewpoints and scenic views');
    assert.ok(es['plan.aiGuide.title']);
    assert.ok(en['plan.aiGuide.title']);
    assert.ok(es['plan.aiTour.resultLabel']);
    assert.ok(en['plan.aiTour.resultLabel']);
    assert.ok(es['plan.aiTour.plainNarrationInstruction']);
    assert.ok(en['plan.aiTour.plainNarrationInstruction']);
    assert.ok(es['tripAiPrompt.wizard.place']);
    assert.ok(en['tripAiPrompt.wizard.accessMode']);
    assert.ok(es['tripAiPrompt.wizard.bookingModeRequired']);
    assert.ok(en['tripAiPrompt.wizard.dateModeWithoutDates']);
  });
});
