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

describe('global checklists view', () => {
  it('adds localized routes, page and scripts for all trip checklists', () => {
    [
      'src/pages/app/checklists/index.astro',
      'src/pages/[locale]/app/checklists/index.astro',
      'src/components/pages/GlobalChecklistsPage.astro',
      'src/scripts/pages/global-checklists.ts',
      'src/scripts/pages/checklist-summary.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('registers dashboard navigation and app route without hardcoded absolute links', () => {
    const routes = readText('src/lib/app/routes.ts');
    const nav = readText('src/components/app/DashboardSectionNav.astro');
    const dashboard = readText('src/components/pages/DashboardPage.astro');

    assert.match(routes, /'checklists'/);
    assert.match(routes, /checklists:\s*'app\/checklists'/);
    assert.match(nav, /appNav\.checklists/);
    assert.match(nav, /getLocalizedPath\('\/app\/checklists\/'/);
    assert.match(dashboard, /data-dashboard-checklist-count/);
  });

  it('keeps global checklist translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/global-checklists/es.json');
    const en = readJson('src/i18n/feature-translations/global-checklists/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['appNav.checklists'], 'Checklists');
    assert.equal(en['appNav.checklists'], 'Checklists');
    assert.match(ui, /feature-translations\/global-checklists\/es\.json/);
    assert.match(ui, /feature-translations\/global-checklists\/en\.json/);
  });

  it('subscribes to each visible trip checklist and surfaces dashboard pending counts', () => {
    const globalScript = readText('src/scripts/pages/global-checklists.ts');
    const summary = readText('src/scripts/pages/checklist-summary.ts');
    const dashboard = readText('src/scripts/pages/dashboard.ts');

    assert.match(summary, /subscribeTripsChecklistItems/);
    assert.match(summary, /subscribeTripChecklistItems\(trip\.id/);
    assert.match(summary, /getPendingChecklistItemsCount/);
    assert.match(globalScript, /renderChecklistGroups/);
    assert.match(globalScript, /globalChecklists\.empty/);
    assert.match(globalScript, /updateTripChecklistItem/);
    assert.match(globalScript, /deleteTripChecklistItem/);
    assert.match(dashboard, /renderPendingChecklistNotice/);
    assert.match(dashboard, /dashboard\.checklistsPending/);
  });
});
