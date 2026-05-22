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
    assert.equal(es['appNav.today'], 'Hoy');
    assert.equal(en['appNav.today'], 'Today');
    assert.match(ui, /feature-translations\/global-today\/es\.json/);
    assert.match(ui, /feature-translations\/global-today\/en\.json/);
  });

  it('filters global today plans to active trips and non-completed plans', () => {
    const helper = readText('src/lib/app/global-today.ts');

    assert.match(helper, /isTripActiveOnDate/);
    assert.match(helper, /trip\.startDate <= today/);
    assert.match(helper, /trip\.endDate >= today/);
    assert.match(helper, /plan\.status !== 'visited'/);
    assert.match(helper, /!plan\.date \|\| plan\.date === today/);
  });
});
