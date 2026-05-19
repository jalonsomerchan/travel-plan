import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip date range validation', () => {
  it('keeps a reusable validation helper available', () => {
    const helperPath = 'src/lib/app/trip-date-range.ts';
    const helper = readText(helperPath);

    assert.equal(existsSync(join(root, helperPath)), true, `${helperPath} should exist`);
    assert.match(helper, /validateTripDateRange/);
    assert.match(helper, /isInvalidTripDateRange/);
    assert.match(helper, /endDate < startDate/);
    assert.match(helper, /trip\.form\.dateRangeError/);
  });

  it('blocks invalid ranges before creating or updating trips', () => {
    ['src/scripts/pages/trip-create.ts', 'src/scripts/pages/trip-edit.ts'].forEach((path) => {
      const source = readText(path);

      assert.match(source, /validateTripDateRange/, `${path} should validate trip date ranges`);
      assert.match(source, /setMessage\(message, t\(/, `${path} should show translated errors`);
      assert.match(source, /return;/, `${path} should stop saving invalid trips`);
    });
  });

  it('announces validation messages accessibly', () => {
    ['src/components/pages/TripCreatePage.astro', 'src/components/pages/TripEditPage.astro'].forEach(
      (path) => {
        const source = readText(path);

        assert.match(source, /role="status"/, `${path} should expose dynamic messages as status`);
        assert.match(source, /aria-live="polite"/, `${path} should announce dynamic messages politely`);
      },
    );
  });

  it('keeps invalid legacy ranges safe in shared trip headers', () => {
    const format = readText('src/lib/app/format.ts');
    const shared = readText('src/scripts/pages/shared.ts');
    const tripMap = readText('src/scripts/pages/trip-map.ts');

    assert.match(format, /isInvalidTripDateRange/);
    assert.match(format, /invalidRangeLabel/);
    assert.match(shared, /formatTripDateRange/);
    assert.match(shared, /trip\.dateRange\.invalid/);
    assert.match(tripMap, /formatTripDateRange/);
  });

  it('keeps trip date validation translations aligned', () => {
    const es = readJson('src/i18n/feature-translations/trip-validation/es.json');
    const en = readJson('src/i18n/feature-translations/trip-validation/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.ok(es['trip.form.dateRangeError']);
    assert.ok(en['trip.dateRange.invalid']);
    assert.match(ui, /feature-translations\/trip-validation\/es\.json/);
    assert.match(ui, /feature-translations\/trip-validation\/en\.json/);
  });
});
