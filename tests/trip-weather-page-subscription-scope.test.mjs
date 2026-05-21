import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip weather page subscription scope usage', () => {
  it('uses the shared scope for trip weather listeners', () => {
    const source = readText('src/scripts/pages/trip-weather.ts');

    assert.match(source, /createSubscriptionScope/);
    assert.match(source, /const subscriptions = createSubscriptionScope/);
    assert.match(source, /pagehide/);
    assert.match(source, /subscriptions\.clear/);
    assert.match(source, /subscriptions\.add\(\n\s*subscribeTrip\(/);
  });
});
