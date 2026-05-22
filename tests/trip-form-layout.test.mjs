import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

describe('trip form layout', () => {
  it('uses the same full-width desktop layout pattern as plan forms', () => {
    const form = readText('src/components/app/TripFormFields.astro');
    const createPage = readText('src/components/pages/TripCreatePage.astro');
    const editPage = readText('src/components/pages/TripEditPage.astro');

    assert.match(form, /data-trip-form-layout/);
    assert.match(form, /xl:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(22rem,0\.9fr\)\]/);
    assert.match(form, /data-trip-form-sidebar/);
    assert.match(form, /xl:sticky xl:top-24/);
    assert.match(form, /trip\.form\.sectionBasics/);
    assert.match(form, /trip\.form\.sectionDestination/);
    assert.match(form, /trip\.form\.sectionAccommodationHelp/);
    assert.match(form, /LocationPickerFields/);
    assert.match(form, /AccommodationFormFields/);
    assert.doesNotMatch(form, /name="startDate"[^>]*required/);
    assert.doesNotMatch(form, /name="endDate"[^>]*required/);
    assert.match(createPage, /class="w-full space-y-4"/);
    assert.match(editPage, /class="mt-6 w-full space-y-4"/);
    assert.doesNotMatch(createPage, /max-w-3xl/);
    assert.doesNotMatch(editPage, /max-w-3xl/);
  });

  it('keeps trip form layout translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/trip-form-layout/es.json');
    const en = readJson('src/i18n/feature-translations/trip-form-layout/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.ok(es['trip.form.sectionBasics']);
    assert.ok(en['trip.form.sectionDestinationHelp']);
    assert.match(ui, /feature-translations\/trip-form-layout\/es\.json/);
    assert.match(ui, /feature-translations\/trip-form-layout\/en\.json/);
  });
});
