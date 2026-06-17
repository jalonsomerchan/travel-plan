import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

describe('global search', () => {
  it('adds the dashboard global search structure and scripts', () => {
    [
      'src/lib/app/global-search.ts',
      'src/lib/firebase/global-search-reads.ts',
      'src/scripts/pages/dashboard-global-search.ts',
      'src/i18n/feature-translations/global-search/es.json',
      'src/i18n/feature-translations/global-search/en.json',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });

    const dashboard = readText('src/components/pages/DashboardPage.astro');

    assert.match(dashboard, /data-dashboard-global-search/);
    assert.match(dashboard, /data-global-search-input/);
    assert.match(dashboard, /mountDashboardGlobalSearch/);
  });

  it('keeps global search translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/global-search/es.json');
    const en = readJson('src/i18n/feature-translations/global-search/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.match(ui, /feature-translations\/global-search\/es\.json/);
    assert.match(ui, /feature-translations\/global-search\/en\.json/);
    assert.match(ui, /globalSearchEs/);
  });

  it('normalizes and groups global search results without adding a heavy dependency', () => {
    const helper = readText('src/lib/app/global-search.ts');
    const controller = readText('src/scripts/pages/dashboard-global-search.ts');

    assert.match(helper, /normalize\('NFD'\)/);
    assert.match(helper, /replace\(\/\[\\u0300-\\u036f\]\//);
    assert.match(helper, /filterGlobalSearchDocuments/);
    assert.match(controller, /fetchUserTripsDirect/);
    assert.match(controller, /getTripPlansOnce/);
    assert.match(controller, /getTripPoisOnce/);
    assert.match(controller, /getTripChecklistItemsOnce/);
  });
});

describe('global Today map improvements', () => {
  it('adds actionable map popups and map summary state', () => {
    const page = readText('src/components/pages/GlobalTodayPage.astro');
    const map = readText('src/scripts/pages/global-today-map.ts');
    const es = readJson('src/i18n/feature-translations/global-today/es.json');
    const en = readJson('src/i18n/feature-translations/global-today/en.json');

    assert.match(page, /data-today-map-summary/);
    assert.match(map, /getAppUrl\(locale, 'plan'/);
    assert.match(map, /today\.map\.popup\.openPlan/);
    assert.match(map, /hasUserInteracted/);
    assert.equal(typeof es['today.map.summary'], 'string');
    assert.equal(typeof en['today.map.summary'], 'string');
  });
});
