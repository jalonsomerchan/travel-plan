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

describe('map smoke checks', () => {
  it('keeps map configuration and reusable controls available', () => {
    [
      'src/config/map-layers.ts',
      'src/scripts/maps/leaflet-map-tools.ts',
      'src/scripts/maps/layers.ts',
      'src/scripts/maps/location.ts',
      'src/scripts/maps/pois.ts',
      'docs/map-providers.md',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps map layers centralized with attribution and without private tokens', () => {
    const mapLayers = readText('src/config/map-layers.ts');

    assert.match(mapLayers, /defaultMapLayerId/);
    assert.match(mapLayers, /mapLayers/);
    assert.match(mapLayers, /urlTemplate/);
    assert.match(mapLayers, /attribution/);
    assert.match(mapLayers, /theme/);
    assert.match(mapLayers, /OpenStreetMap contributors/);
    assert.match(mapLayers, /mapPoiCategories/);
    assert.match(mapLayers, /mapPoiLimit/);
    assert.doesNotMatch(mapLayers, /api[_-]?key|token|secret/i);
  });

  it('keeps map controls accessible and interaction based', () => {
    const layers = readText('src/scripts/maps/layers.ts');
    const location = readText('src/scripts/maps/location.ts');
    const pois = readText('src/scripts/maps/pois.ts');
    const tripMap = readText('src/components/pages/TripMapPage.astro');
    const tripMapScript = readText('src/scripts/pages/trip-map.ts');
    const planPage = readText('src/scripts/pages/plan.ts');

    assert.match(layers, /aria-label/);
    assert.match(location, /button.addEventListener\('click'/);
    assert.match(location, /addUserLocationMarker/);
    assert.match(location, /navigator\.geolocation\.getCurrentPosition/);
    assert.match(location, /PERMISSION_DENIED/);
    assert.match(location, /TIMEOUT/);
    assert.match(location, /map-user-location-marker/);
    assert.match(pois, /role', 'status'/);
    assert.match(pois, /mapPoiLimit/);
    assert.match(tripMap, /aria-label=\{t\('map\.canvasTitle'\)\}/);
    assert.match(tripMapScript, /centerOnLocation: false/);
    assert.match(planPage, /addMapTools\(map, t\)/);
  });

  it('keeps map feature translations aligned', () => {
    const es = readJson('src/i18n/feature-translations/map/es.json');
    const en = readJson('src/i18n/feature-translations/map/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.ok(es['map.layers.label']);
    assert.ok(en['map.location.denied']);
    assert.match(ui, /feature-translations\/map\/es\.json/);
    assert.match(ui, /feature-translations\/map\/en\.json/);
  });
});
