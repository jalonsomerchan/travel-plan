import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip accommodation Firebase reads', () => {
  it('uses a cached one-shot trip read instead of a live trip listener', () => {
    const accommodation = readText('src/scripts/pages/trip-accommodation.ts');

    assert.match(accommodation, /getTripOnce/);
    assert.match(accommodation, /syncAccommodationForm/);
    assert.match(accommodation, /currentTrip = null/);
    assert.doesNotMatch(accommodation, /createSubscriptionScope/);
    assert.doesNotMatch(accommodation, /subscribeTrip/);
  });
});
