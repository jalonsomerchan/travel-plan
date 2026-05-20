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

describe('trip location coordinate saving', () => {
  it('keeps a shared validation helper for trip location coordinates', () => {
    const helper = readText('src/lib/app/trip-location.ts');

    assert.match(helper, /getTripLocationValidationKey/);
    assert.match(helper, /getTripLocationInputFromForm/);
    assert.match(helper, /hasTripLocationCoordinates/);
    assert.match(helper, /locationQuery/);
    assert.match(helper, /trip\.form\.locationSelectionRequired/);
    assert.match(helper, /trip\.form\.locationInvalidCoordinates/);
  });

  it('renders the trip location picker as a required mapped field', () => {
    const source = readText('src/components/app/TripFormFields.astro');

    assert.match(source, /LocationPickerFields/);
    assert.match(source, /nameFieldName="location"/);
    assert.match(source, /latFieldName="locationLat"/);
    assert.match(source, /lngFieldName="locationLng"/);
    assert.match(source, /queryFieldName="locationQuery"/);
    assert.match(source, /required/);
  });

  it('blocks create and edit when the trip location text has no coordinates', () => {
    ['src/scripts/pages/trip-create.ts', 'src/scripts/pages/trip-edit.ts'].forEach((path) => {
      const source = readText(path);

      assert.match(source, /getTripLocationValidationKey/);
      assert.match(source, /setMessage\(message, t\(locationValidationKey\), 'danger'\)/);
      assert.match(source, /getTripLocationInputFromForm\(form\)/);
      assert.match(source, /locationLat: tripLocation\.locationLat/);
      assert.match(source, /locationLng: tripLocation\.locationLng/);
    });
  });

  it('clears stale optional trip coordinates on update', () => {
    const source = readText('src/lib/firebase/trips.ts');

    assert.match(source, /deleteField/);
    assert.match(source, /getTripUpdateData/);
    assert.match(source, /data\.locationLat = deleteField\(\)/);
    assert.match(source, /data\.locationLng = deleteField\(\)/);
  });

  it('uses the trip location as map centering fallback without creating a marker', () => {
    const source = readText('src/scripts/pages/trip-map.ts');

    assert.match(source, /addTripLocationFallback/);
    assert.match(source, /!hasTripLocationCoordinates\(trip\)/);
    assert.match(source, /bounds\.extend\(L\.latLng\(trip\.locationLat, trip\.locationLng\)\)/);
    assert.match(source, /addTripLocationFallback\(currentTrip, bounds\)/);
  });

  it('keeps trip location validation messages translated', () => {
    const es = readJson('src/i18n/translations/es.json');
    const en = readJson('src/i18n/translations/en.json');

    assert.equal(typeof es['trip.form.locationHelper'], 'string');
    assert.equal(typeof es['trip.form.locationClear'], 'string');
    assert.equal(typeof es['trip.form.locationSelectionRequired'], 'string');
    assert.equal(typeof es['trip.form.locationInvalidCoordinates'], 'string');
    assert.equal(typeof en['trip.form.locationHelper'], 'string');
    assert.equal(typeof en['trip.form.locationClear'], 'string');
    assert.equal(typeof en['trip.form.locationSelectionRequired'], 'string');
    assert.equal(typeof en['trip.form.locationInvalidCoordinates'], 'string');
  });
});
