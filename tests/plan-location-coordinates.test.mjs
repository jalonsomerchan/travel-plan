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

describe('plan location coordinate saving', () => {
  it('keeps a shared validation helper for plan location coordinates', () => {
    const helper = readText('src/lib/app/plan-location.ts');
    const coordinates = readText('src/lib/app/coordinates.ts');

    assert.match(helper, /getPlanLocationValidationKey/);
    assert.match(helper, /toCoordinateNumber/);
    assert.match(helper, /hasLocationCoordinates/);
    assert.match(coordinates, /toCoordinateNumber/);
    assert.match(coordinates, /isValidLatitude/);
    assert.match(coordinates, /isValidLongitude/);
    assert.match(helper, /plan\.location\.selectionRequired/);
    assert.match(helper, /plan\.location\.invalidCoordinates/);
  });

  it('blocks create and edit when a location text has no coordinates', () => {
    ['src/scripts/pages/plan-create.ts', 'src/scripts/pages/plan-edit.ts'].forEach((path) => {
      const source = readText(path);

      assert.match(source, /getPlanLocationValidationKey/);
      assert.match(source, /setMessage\(message, t\(locationValidationKey\), 'danger'\)/);
      assert.match(source, /return;/);
      assert.match(source, /getPlanInputFromForm\(form\)/);
    });
  });

  it('clears stale optional plan coordinates on update', () => {
    const source = readText('src/lib/firebase/plans.ts');

    assert.match(source, /deleteField/);
    assert.match(source, /optionalPlanFields/);
    assert.match(source, /locationName/);
    assert.match(source, /locationLat/);
    assert.match(source, /locationLng/);
    assert.match(source, /getPlanUpdateData/);
  });

  it('keeps coordinate validation messages translated', () => {
    const es = readJson('src/i18n/feature-translations/poi/es.json');
    const en = readJson('src/i18n/feature-translations/poi/en.json');

    assert.equal(typeof es['plan.location.selectionRequired'], 'string');
    assert.equal(typeof es['plan.location.invalidCoordinates'], 'string');
    assert.equal(typeof en['plan.location.selectionRequired'], 'string');
    assert.equal(typeof en['plan.location.invalidCoordinates'], 'string');
    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  });
});
