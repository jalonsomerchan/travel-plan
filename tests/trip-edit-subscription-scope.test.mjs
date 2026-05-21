import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip edit subscription scope usage', () => {
  it('uses the shared scope for the trip edit listener', () => {
    const tripEdit = readText('src/scripts/pages/trip-edit.ts');

    assert.match(tripEdit, /createSubscriptionScope/);
    assert.match(tripEdit, /const subscriptions = createSubscriptionScope/);
    assert.match(tripEdit, /pagehide/);
    assert.match(tripEdit, /subscriptions\.clear/);
    assert.match(tripEdit, /subscriptions\.add\(\n\s*subscribeTrip\(/);
  });
});
