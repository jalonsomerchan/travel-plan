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

describe('trip POIs AI prompt tool', () => {
  it('keeps the route, page, script and helper available', () => {
    [
      'src/lib/app/trip-pois-ai-prompt.ts',
      'src/lib/app/trip-pois-ai-prompt-builder.ts',
      'src/lib/app/trip-pois-ai-prompt-wizard.ts',
      'src/components/pages/TripPoisAiPromptPage.astro',
      'src/components/app/TripPoisAiPromptBody.astro',
      'src/components/app/TripPoisAiPromptWizard.astro',
      'src/scripts/pages/trip-pois-ai-prompt.ts',
      'src/scripts/pages/trip-pois-ai-prompt-wizard.ts',
      'src/pages/app/trip-pois-ai/index.astro',
      'src/pages/[locale]/app/trip-pois-ai/index.astro'
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('registers the route and links it from the POIs page', () => {
    const routes = readText('src/lib/app/routes.ts');
    const poisPage = readText('src/components/pages/TripPoisPage.astro');
    const poisScript = readText('src/scripts/pages/trip-pois.ts');

    assert.match(routes, /'trip-pois-ai'/);
    assert.match(routes, /app\/trip-pois-ai/);
    assert.match(poisPage, /data-trip-poi-ai-link/);
    assert.match(poisPage, /tripPois\.createAiAction/);
    assert.match(poisScript, /getAppUrl\(locale, 'trip-pois-ai'/);
  });

  it('keeps wizard, parsing and point saving wired', () => {
    const body = readText('src/components/app/TripPoisAiPromptBody.astro');
    const wizard = readText('src/components/app/TripPoisAiPromptWizard.astro');
    const helper = readText('src/lib/app/trip-pois-ai-prompt.ts');
    const builder = readText('src/lib/app/trip-pois-ai-prompt-builder.ts');
    const script = readText('src/scripts/pages/trip-pois-ai-prompt.ts');

    assert.match(body, /TripPoisAiPromptWizard/);
    assert.match(body, /data-trip-pois-ai-prompt-output/);
    assert.match(body, /data-trip-pois-ai-import-form/);
    assert.match(wizard, /name="type"/);
    assert.match(wizard, /trip-pois-ai-prompt/);
    assert.match(helper, /buildTripPoiAiPrompt/);
    assert.match(helper, /parseTripPoiAiPromptJson/);
    assert.match(helper, /JSON\.parse/);
    assert.match(builder, /buildTripPoiAiPromptFromWizard/);
    assert.match(script, /initTripPoisAiPromptWizard/);
    assert.match(script, /createTripPointOfInterest/);
    assert.match(script, /data-trip-pois-ai-candidate-checkbox/);
  });

  it('keeps feature translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/trip-pois-ai-prompt/es.json');
    const en = readJson('src/i18n/feature-translations/trip-pois-ai-prompt/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['tripPois.createAiAction'], 'Generar puntos de interes con IA');
    assert.ok(en['tripPoisAiPrompt.import.ready']);
    assert.ok(es['tripPoisAiPrompt.wizard.place']);
    assert.ok(en['tripPoisAiPrompt.wizard.type']);
    assert.match(ui, /feature-translations\/trip-pois-ai-prompt\/es\.json/);
    assert.match(ui, /feature-translations\/trip-pois-ai-prompt\/en\.json/);
  });
});
