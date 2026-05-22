import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan date rules', () => {
  it('keeps plan date normalization and parent mini trip validation centralized', () => {
    const helper = readText('src/lib/app/plan-dates.ts');

    assert.match(helper, /export function isSingleDayTrip/);
    assert.match(helper, /export function getForcedPlanDateForTrip/);
    assert.match(helper, /export function normalizePlanInputForTrip/);
    assert.match(helper, /export function validatePlanDateForTrip/);
    assert.match(helper, /plan\.form\.dateOutsideParentTripRange/);
  });

  it('applies date rules when creating and editing plans', () => {
    ['src/scripts/pages/plan-create.ts', 'src/scripts/pages/plan-edit.ts'].forEach((path) => {
      const source = readText(path);

      assert.match(source, /normalizePlanInputForTrip/);
      assert.match(source, /validatePlanDateForTrip/);
      assert.match(source, /getForcedPlanDateForTrip/);
      assert.match(source, /currentTrip/);
    });
  });

  it('keeps the date field optional in the form and translates the mini trip range error', () => {
    const form = readText('src/components/app/PlanFormFields.astro');
    const es = readJson('src/i18n/translations/es.json');
    const en = readJson('src/i18n/translations/en.json');

    assert.match(form, /name="date"/);
    assert.doesNotMatch(form, /name="date"[^>]*required/);
    assert.equal(es['plan.form.date'], 'Fecha opcional');
    assert.equal(en['plan.form.date'], 'Optional date');
    assert.ok(es['plan.form.dateOutsideParentTripRange']);
    assert.ok(en['plan.form.dateOutsideParentTripRange']);
  });
});
