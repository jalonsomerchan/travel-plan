import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('cached one-shot reads', () => {
  it('provides a cached one-shot trip reader', () => {
    const reader = readText('src/lib/firebase/trip-reads.ts');

    assert.match(reader, /getDoc/);
    assert.match(reader, /getCachedTrip/);
    assert.match(reader, /setCachedTrip/);
    assert.match(reader, /export async function getTripOnce/);
  });

  it('provides a cached one-shot plan reader', () => {
    const reader = readText('src/lib/firebase/plan-reads.ts');

    assert.match(reader, /getDoc/);
    assert.match(reader, /getCachedTripPlans/);
    assert.match(reader, /export async function getPlanOnce/);
  });

  it('uses one-shot trip reads on the plan create page instead of a trip listener', () => {
    const page = readText('src/scripts/pages/plan-create.ts');

    assert.match(page, /getTripOnce/);
    assert.doesNotMatch(page, /subscribeTrip/);
    assert.doesNotMatch(page, /createSubscriptionScope/);
  });

  it('uses one-shot trip and plan reads on the plan edit page instead of live listeners', () => {
    const page = readText('src/scripts/pages/plan-edit.ts');

    assert.match(page, /getTripOnce/);
    assert.match(page, /getPlanOnce/);
    assert.doesNotMatch(page, /subscribeTrip/);
    assert.doesNotMatch(page, /subscribePlan/);
  });

  it('documents one-shot cached reads', () => {
    const docs = readText('docs/firebase-shared-cache.md');

    assert.match(docs, /getTripOnce/);
    assert.match(docs, /lecturas puntuales cacheadas/);
  });
});
