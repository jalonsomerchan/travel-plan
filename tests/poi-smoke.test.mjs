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
      'src/config/trip-pois.ts',
      'src/lib/app/poi.ts',
      'src/lib/app/trip-pois.ts',
      'src/lib/app/trip-poi-icons.ts',
      'src/components/app/NearbyPoiExplorer.astro',
      'src/components/app/TripPoiFormDialog.astro',
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
    assert.ok(en['tripPois.form.visible']);
    assert.ok(en['poi.plan.title']);
    assert.match(ui, /feature-translations\/poi\/es\.json/);
    assert.match(ui, /feature-translations\/poi\/en\.json/);
  });

  it('keeps saved trip points editable and visible on trip maps', () => {
    const service = readText('src/lib/firebase/trip-pois.ts');
    const helperModel = readText('src/lib/app/trip-pois.ts');
    const helper = readText('src/lib/app/trip-poi-icons.ts');
    const pageComponent = readText('src/components/pages/TripPoisPage.astro');
    const dialog = readText('src/components/app/TripPoiFormDialog.astro');
    const page = readText('src/scripts/pages/trip-pois.ts');
    const map = readText('src/scripts/pages/trip-map.ts');
    const markers = readText('src/scripts/maps/trip-markers.ts');
    const rules = readText('firebase/firestore.rules');
    const nav = readText('src/components/app/TripSectionNav.astro');
    const actions = readText('src/components/app/TripActionsMenu.astro');
    const locationPicker = readText('src/scripts/pages/plan-location-picker.ts');

    assert.match(service, /pointsOfInterest/);
    assert.match(service, /createTripPointOfInterest/);
    assert.match(service, /updateTripPointOfInterest/);
    assert.match(service, /description/);
    assert.match(service, /isVisible/);
    assert.match(service, /normalizeTripPoiColor/);
    assert.match(helperModel, /tripPoiTypeMeta/);
    assert.match(helperModel, /shouldShowTripPoiOnMap/);
    assert.match(helper, /resolveTripPoiIcon/);
    assert.match(helper, /presetPoiIcons/);
    assert.match(pageComponent, /data-trip-poi-open-create/);
    assert.match(pageComponent, /data-trip-poi-snackbar/);
    assert.match(dialog, /data-trip-poi-dialog/);
    assert.match(dialog, /tripPois\.form\.type/);
    assert.match(dialog, /tripPois\.form\.visible/);
    assert.match(dialog, /list="trip-poi-icon-suggestions"/);
    assert.match(page, /data-trip-poi-edit/);
    assert.match(page, /showSnackbar/);
    assert.match(page, /showModal|openPoiDialog/);
    assert.match(page, /initLocationPickers/);
    assert.match(page, /resolveTripPoiIcon/);
    assert.match(page, /tripPois\.modal\.createTitle/);
    assert.match(page, /tripPois\.visibility\.visible/);
    assert.match(locationPicker, /data-location-current-button/);
    assert.match(page, /revealAppShell\(\);\s*initLocationPickers\(\)/);
    assert.match(map, /subscribeTripPointsOfInterest/);
    assert.match(map, /createTripPoiIcon/);
    assert.match(map, /shouldShowTripPoiOnMap/);
    assert.match(map, /point\.color/);
    assert.match(markers, /point\.color/);
    assert.match(map, /locateOnLoad: true/);
    assert.match(map, /centerOnLocation: false/);
    assert.match(rules, /match \/pointsOfInterest\/{pointId}/);
    assert.match(nav, /trip-pois-link/);
    assert.match(actions, /trip-pois-action-link/);
    assert.doesNotMatch(actions, /id: 'trip-pois-link'/);
  });
});
