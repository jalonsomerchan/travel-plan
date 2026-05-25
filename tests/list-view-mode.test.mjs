import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

describe('global list view mode', () => {
  it('keeps a single localStorage-backed helper for compact and detailed list views', () => {
    const helper = readText('src/scripts/pages/list-view-mode.ts');
    const styles = readText('src/styles/global.css');

    assert.match(helper, /travel-plan:list-view-mode/);
    assert.match(helper, /window\.localStorage\.getItem\(storageKey\)/);
    assert.match(helper, /window\.localStorage\.setItem\(storageKey, mode\)/);
    assert.match(helper, /document\.documentElement\.dataset\.listViewMode/);
    assert.match(helper, /data-list-view-toggle/);
    assert.match(styles, /\[data-list-view-mode="compact"\] \[data-list-detail\]/);
    assert.match(styles, /\[data-list-card\]/);
  });

  it('adds translated controls for the shared list view toggle', () => {
    const es = readJson('src/i18n/feature-translations/list-view/es.json');
    const en = readJson('src/i18n/feature-translations/list-view/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.match(ui, /feature-translations\/list-view\/es\.json/);
    assert.match(ui, /feature-translations\/list-view\/en\.json/);
  });

  it('wires the toggle into the main list renderers', () => {
    [
      'src/scripts/pages/dashboard.ts',
      'src/scripts/pages/trip.ts',
      'src/scripts/pages/trip-mini-trips.ts',
      'src/scripts/pages/trip-checklist-groups.ts',
      'src/scripts/pages/trip-luggage.ts',
      'src/scripts/pages/trip-members.ts',
      'src/scripts/pages/trip-invites.ts',
      'src/scripts/pages/trip-pois.ts',
      'src/scripts/pages/trip-map.ts',
      'src/scripts/pages/trip-calendar.ts',
      'src/scripts/pages/global-today-render.ts',
    ].forEach((path) => {
      const source = readText(path);

      assert.match(source, /ensureListViewToggle/, `${path} should render a list view toggle`);
      assert.match(source, /data-list-detail/, `${path} should mark secondary list details`);
    });
  });
});
