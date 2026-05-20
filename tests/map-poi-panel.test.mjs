import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('map POI panel', () => {
  it('renders the POI options panel outside the Leaflet control container', () => {
    const pois = readText('src/scripts/maps/pois.ts');

    assert.match(pois, /document\.body\.append\(panel\)/);
    assert.match(pois, /map-poi-panel-portal/);
    assert.match(pois, /positionPortalPanel/);
    assert.match(pois, /panel\.style\.position = 'fixed'/);
    assert.match(pois, /panel\.contains\(target\)/);
    assert.match(pois, /control\.onRemove/);
    assert.doesNotMatch(pois, /container\.append\(trigger, panel\)/);
  });
});
