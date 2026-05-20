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

describe('poi smoke checks', () => {
  it('keeps nearby poi modules and routes available', () => {
    [
      'src/config/poi.ts',
      'src/lib/app/poi.ts',
      'src/components/app/NearbyPoiExplorer.astro',
      'src/components/pages/TripPoisPage.astro',
      'src/lib/firebase/trip-pois.ts',
      'src/pages/app/trip-pois/index.astro',
      'src/pages/[locale]/app/trip-pois/index.astro',
      'src/scripts/pages/nearby-poi-explorer.ts',
      'src/scripts/pages/trip-pois.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps overpass usage limited and without private keys', () => {
    const poiConfig = readText('src/config/poi.ts');
    const poiService = readText('src/lib/app/poi.ts');

    assert.match(poiConfig, /nearbyPoiMaxRadius/);
    assert.match(poiConfig, /nearbyPoiResultLimit/);
    assert.match(poiService, /https:\/\/overpass-api\.de\/api\/interpreter/);
    assert.match(poiService, /method:\s*'POST'/);
    assert.match(poiService, /application\/x-www-form-urlencoded/);
    assert.match(poiService, /out center tags/);
    assert.doesNotMatch(poiService, /api[_-]?key|token|secret/i);
  });

  it('keeps poi feature translations aligned', () => {
    const es = readJson('src/i18n/feature-translations/poi/es.json');
    const en = readJson('src/i18n/feature-translations/poi/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.ok(es['tripPois.metaTitle']);
    assert.ok(es['tripPois.form.name']);
    assert.ok(en['tripPois.form.location']);
    assert.ok(en['poi.plan.title']);
    assert.match(ui, /feature-translations\/poi\/es\.json/);
    assert.match(ui, /feature-translations\/poi\/en\.json/);
  });

  it('keeps saved trip points editable and visible on trip maps', () => {
    const service = readText('src/lib/firebase/trip-pois.ts');
    const page = readText('src/scripts/pages/trip-pois.ts');
    const map = readText('src/scripts/pages/trip-map.ts');
    const rules = readText('firebase/firestore.rules');
    const nav = readText('src/components/app/TripSectionNav.astro');
    const locationPicker = readText('src/scripts/pages/plan-location-picker.ts');

    assert.match(service, /pointsOfInterest/);
    assert.match(service, /createTripPointOfInterest/);
    assert.match(service, /updateTripPointOfInterest/);
    assert.match(page, /data-trip-poi-edit/);
    assert.match(page, /initLocationPickers/);
    assert.match(locationPicker, /data-location-current-button/);
    assert.match(page, /revealAppShell\(\);\s*initLocationPickers\(\)/);
    assert.match(map, /subscribeTripPointsOfInterest/);
    assert.match(map, /createTripPoiIcon/);
    assert.match(map, /locateOnLoad: true/);
    assert.match(map, /centerOnLocation: false/);
    assert.match(rules, /match \/pointsOfInterest\/{pointId}/);
    assert.match(nav, /trip-pois-link/);
  });
});
