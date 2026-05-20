import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip page subscription scope usage', () => {
  it('uses the shared scope for trip page listeners', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');

    assert.match(tripPage, /createSubscriptionScope/);
    assert.match(tripPage, /const subscriptions = createSubscriptionScope/);
    assert.match(tripPage, /resetState/);
    assert.match(tripPage, /pagehide/);
    assert.match(tripPage, /subscriptions\.clear/);
    assert.match(tripPage, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(tripPage, /subscriptions\.add\(\n\s*subscribeTripPlans\(/);
    assert.match(tripPage, /subscriptions\.add\(\n\s*subscribeTripChecklistItems\(/);
  });
});
