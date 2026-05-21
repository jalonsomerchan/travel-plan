import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan flags', () => {
  it('keeps plan flags in the model, form and firestore mapping', () => {
    const models = readText('src/lib/app/models.ts');
    const location = readText('src/lib/app/plan-location.ts');
    const firestore = readText('src/lib/firebase/plans.ts');
    const form = readText('src/components/app/PlanFormFields.astro');
    const edit = readText('src/scripts/pages/plan-edit.ts');

    ['isPaid', 'isBooked', 'isOptional', 'isImportant'].forEach((field) => {
      assert.match(models, new RegExp(`${field}: boolean;`));
      assert.match(location, new RegExp(`${field}: data\\.get\\('${field}'\\) === 'on'`));
      assert.match(firestore, new RegExp(`${field}: data\\.${field} === true`));
      assert.match(form, new RegExp(`name="${field}"`));
      assert.match(edit, new RegExp(`namedItem\\('${field}'\\).*checked = plan\\.${field}`));
    });
  });

  it('reuses plan flag indicators across trip lists, calendars and maps', () => {
    const helper = readText('src/lib/app/plan-flags.ts');
    const trip = readText('src/scripts/pages/trip.ts');
    const tripCalendar = readText('src/scripts/pages/trip-calendar.ts');
    const globalCalendar = readText('src/scripts/pages/global-calendar.ts');
    const map = readText('src/scripts/pages/trip-map.ts');
    const es = readText('src/i18n/translations/es.json');
    const en = readText('src/i18n/translations/en.json');

    assert.match(helper, /getPlanNameWithFlagsHtml/);
    assert.match(helper, /getPlanFlagsHtml/);
    assert.match(helper, /plan\.flag\.paid/);
    assert.match(helper, />\$</);
    assert.match(helper, />✓</);
    assert.match(helper, />\?</);
    assert.match(helper, />!</);
    assert.match(trip, /getPlanFlagsHtml\(plan, t\)/);
    assert.doesNotMatch(trip, /getPlanNameWithFlagsHtml\(plan, t\)/);
    assert.match(tripCalendar, /getPlanNameWithFlagsHtml\(plan, t\)/);
    assert.match(globalCalendar, /getPlanNameWithFlagsHtml\(plan, t\)/);
    assert.match(map, /getPlanNameWithFlagsHtml\(plan, t\)/);
    assert.match(es, /"plan\.form\.isPaid": "Plan de pago"/);
    assert.match(en, /"plan\.form\.isPaid": "Paid plan"/);
  });
});
