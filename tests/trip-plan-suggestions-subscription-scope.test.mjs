import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip plan suggestions subscription scope usage', () => {
  it('uses the shared scope for trip and plan listeners', () => {
    const suggestions = readText('src/scripts/pages/trip-plan-suggestions.ts');

    assert.match(suggestions, /createSubscriptionScope/);
    assert.match(suggestions, /const subscriptions = createSubscriptionScope/);
    assert.match(suggestions, /resetSessionState/);
    assert.match(suggestions, /pagehide/);
    assert.match(suggestions, /subscriptions\.clear/);
    assert.match(suggestions, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(suggestions, /subscriptions\.add\(\n\s*subscribeTripPlans\(/);
  });
});
