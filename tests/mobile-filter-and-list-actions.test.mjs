import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('mobile filters and list actions', () => {
  it('keeps trip filters collapsed behind a mobile toggle', () => {
    const component = readText('src/components/pages/TripPage.astro');
    const script = readText('src/scripts/pages/trip.ts');
    const es = readText('src/i18n/translations/es.json');
    const en = readText('src/i18n/translations/en.json');

    assert.match(component, /data-plan-filters-toggle/);
    assert.match(component, /aria-expanded="false"/);
    assert.match(component, /id="trip-plan-filters"/);
    assert.match(component, /class="mt-3 hidden gap-3 sm:grid sm:grid-cols-3"/);
    assert.match(script, /filtersToggle\?\.addEventListener\('click'/);
    assert.match(script, /filtersForm\?\.classList\.toggle\('hidden', isExpanded\)/);
    assert.match(es, /"trip\.filters\.toggle": "Filtrar"/);
    assert.match(en, /"trip\.filters\.toggle": "Filters"/);
  });

  it('uses icon-only remove buttons with accessible labels', () => {
    const checklist = readText('src/scripts/pages/trip-checklist.ts');
    const luggage = readText('src/scripts/pages/trip-luggage.ts');

    [checklist, luggage].forEach((source) => {
      assert.match(source, /function getTrashIcon\(\)/);
      assert.match(source, /<svg aria-hidden="true"/);
      assert.match(source, /<span class="sr-only">\$\{escapeHtml\(t\('trip(?:Checklist|Luggage)\.remove'\)\)\}<\/span>/);
      assert.match(source, /title="\$\{escapeHtml\(t\('trip(?:Checklist|Luggage)\.remove'\)\)\}"/);
    });
  });
});
