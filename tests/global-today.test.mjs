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

describe('global today view', () => {
  it('adds localized routes, page and scripts for the global Today view', () => {
    [
      'src/pages/app/today/index.astro',
      'src/pages/[locale]/app/today/index.astro',
      'src/components/pages/GlobalTodayPage.astro',
      'src/scripts/pages/global-today.ts',
      'src/scripts/pages/global-today-render.ts',
      'src/scripts/pages/global-today-map.ts',
      'src/lib/app/global-today.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('registers today navigation and app route without hardcoded absolute links', () => {
    const routes = readText('src/lib/app/routes.ts');
    const nav = readText('src/components/app/DashboardSectionNav.astro');

    assert.match(routes, /'today'/);
    assert.match(routes, /today:\s*'app\/today'/);
    assert.match(nav, /appNav\.today/);
    assert.match(nav, /getLocalizedPath\('\/app\/today\/'/);
  });

  it('keeps global today translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/global-today/es.json');
    const en = readJson('src/i18n/feature-translations/global-today/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['appNav.today'], 'Ahora');
    assert.equal(en['appNav.today'], 'Now');
    assert.match(ui, /feature-translations\/global-today\/es\.json/);
    assert.match(ui, /feature-translations\/global-today\/en\.json/);
  });

  it('filters global today plans to pending items across all visible trips', () => {
    const helper = readText('src/lib/app/global-today.ts');
    const page = readText('src/components/pages/GlobalTodayPage.astro');
    const map = readText('src/scripts/pages/global-today-map.ts');

    assert.match(helper, /filter\(isPendingPlan\)/);
    assert.match(helper, /trips\.flatMap/);
    assert.match(helper, /status: 'pending'/);
    assert.match(helper, /maxDistanceKm/);
    assert.match(helper, /includeWithoutDate/);
    assert.match(page, /data-today-map-panel/);
    assert.match(page, /data-today-map-toggle/);
    assert.match(map, /today\.map\.onlyUserLocation/);
    assert.match(map, /today\.map\.withoutUserLocation/);
  });

  it('uses the shared map controls and visibility filters on the global Today map', () => {
    const map = readText('src/scripts/pages/global-today-map.ts');
    const page = readText('src/scripts/pages/global-today.ts');
    const location = readText('src/scripts/maps/location.ts');

    assert.match(map, /addMapTools/);
    assert.match(map, /addMapVisibilityControl/);
    assert.match(map, /getMapVisibilityState/);
    assert.match(map, /visibility\.categories\[item\.plan\.category\]/);
    assert.match(map, /visibility\.proposedPlans/);
    assert.match(map, /visibility\.plans/);
    assert.match(map, /visibility\.currentLocation/);
    assert.match(map, /locateOnLoad:\s*true/);
    assert.match(map, /renderMarker:\s*false/);
    assert.match(page, /onLocation:\s*\(location\)/);
    assert.match(location, /onLocation\?:/);
    assert.match(location, /options\.onLocation\?\.\(nextLocation\)/);
  });
});
