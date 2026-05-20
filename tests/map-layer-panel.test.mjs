import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('map layer panel', () => {
  it('renders the layer selector panel outside the Leaflet control container', () => {
    const layers = readText('src/scripts/maps/layers.ts');

    assert.match(layers, /document\.body\.append\(panel\)/);
    assert.match(layers, /map-layer-panel-portal/);
    assert.match(layers, /positionPortalPanel/);
    assert.match(layers, /panel\.style\.position = 'fixed'/);
    assert.match(layers, /panel\.contains\(target\)/);
    assert.match(layers, /control\.onRemove/);
    assert.doesNotMatch(layers, /container\.append\(trigger, panel\)/);
  });
});
