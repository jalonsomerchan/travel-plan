import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan create Firebase reads', () => {
  it('uses a cached one-shot trip read instead of a live trip listener', () => {
    const planCreate = readText('src/scripts/pages/plan-create.ts');

    assert.match(planCreate, /getTripOnce/);
    assert.match(planCreate, /observeSession/);
    assert.doesNotMatch(planCreate, /createSubscriptionScope/);
    assert.doesNotMatch(planCreate, /subscribeTrip/);
  });
});
