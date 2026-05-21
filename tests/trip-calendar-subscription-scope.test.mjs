import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip calendar subscription scope usage', () => {
  it('uses the shared scope for calendar trip and plan listeners', () => {
    const calendar = readText('src/scripts/pages/trip-calendar.ts');

    assert.match(calendar, /createSubscriptionScope/);
    assert.match(calendar, /const subscriptions = createSubscriptionScope/);
    assert.match(calendar, /pagehide/);
    assert.match(calendar, /subscriptions\.clear/);
    assert.match(calendar, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(calendar, /subscriptions\.add\(\n\s*subscribeTripPlans\(/);
  });
});
