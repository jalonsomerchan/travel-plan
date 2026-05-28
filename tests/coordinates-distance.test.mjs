import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('shared coordinate distance helpers', () => {
  it('centralizes coordinate validation, formatting and distance math', () => {
    const coordinates = readText('src/lib/app/coordinates.ts');
    const accommodation = readText('src/lib/app/accommodation.ts');
    const poi = readText('src/lib/app/poi.ts');
    const today = readText('src/lib/app/global-today.ts');

    assert.match(coordinates, /export interface Coordinates/);
    assert.match(coordinates, /hasLocationCoordinates/);
    assert.match(coordinates, /formatCoordinatesLabel/);
    assert.match(coordinates, /getDistanceBetweenCoordinates/);
    assert.match(accommodation, /getCoordinatesDistanceKm/);
    assert.match(poi, /formatCoordinatesLabel/);
    assert.match(today, /getDistanceBetweenCoordinates/);
  });
});
