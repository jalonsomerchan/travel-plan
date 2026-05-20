import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('map current location control', () => {
  it('keeps automatic locating separate from user-triggered centering', () => {
    const locationTool = readText('src/scripts/maps/location.ts');
    const tripMap = readText('src/scripts/pages/trip-map.ts');

    assert.match(locationTool, /forceCenter = false/);
    assert.match(locationTool, /centerOnLocation \|\| forceCenter/);
    assert.match(locationTool, /userLocation\.locate\(status, button, true\)/);
    assert.match(tripMap, /locateOnLoad: true/);
    assert.match(tripMap, /centerOnLocation: false/);
  });
});
