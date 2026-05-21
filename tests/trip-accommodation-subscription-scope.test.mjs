import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip accommodation subscription scope usage', () => {
  it('uses the shared scope for the accommodation trip listener', () => {
    const accommodation = readText('src/scripts/pages/trip-accommodation.ts');

    assert.match(accommodation, /createSubscriptionScope/);
    assert.match(accommodation, /const subscriptions = createSubscriptionScope/);
    assert.match(accommodation, /pagehide/);
    assert.match(accommodation, /subscriptions\.clear/);
    assert.match(accommodation, /currentTrip = null/);
    assert.match(accommodation, /subscriptions\.add\(\n\s*subscribeTrip\(/);
  });
});
