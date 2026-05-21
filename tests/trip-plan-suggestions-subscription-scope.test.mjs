import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip plan suggestions Firebase reads', () => {
  it('uses cached one-shot reads for trip and plans', () => {
    const suggestions = readText('src/scripts/pages/trip-plan-suggestions.ts');

    assert.match(suggestions, /getTripOnce/);
    assert.match(suggestions, /getTripPlansOnce/);
    assert.match(suggestions, /syncTripForm/);
    assert.match(suggestions, /Promise\.all\(\[getTripOnce\(tripId\), getTripPlansOnce\(tripId\)\]\)/);
    assert.doesNotMatch(suggestions, /createSubscriptionScope/);
    assert.doesNotMatch(suggestions, /subscribeTrip/);
    assert.doesNotMatch(suggestions, /subscribeTripPlans/);
  });
});
