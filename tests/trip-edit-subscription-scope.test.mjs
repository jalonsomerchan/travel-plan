import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip edit Firebase reads', () => {
  it('uses a cached one-shot trip read instead of a live trip listener', () => {
    const tripEdit = readText('src/scripts/pages/trip-edit.ts');

    assert.match(tripEdit, /getTripOnce/);
    assert.match(tripEdit, /syncTripForm/);
    assert.doesNotMatch(tripEdit, /createSubscriptionScope/);
    assert.doesNotMatch(tripEdit, /subscribeTrip/);
  });
});
