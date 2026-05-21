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

  it('provides cached one-shot plan readers', () => {
    const reader = readText('src/lib/firebase/plan-reads.ts');

    assert.match(reader, /getDoc/);
    assert.match(reader, /getDocs/);
    assert.match(reader, /getCachedTripPlans/);
    assert.match(reader, /setCachedTripPlans/);
    assert.match(reader, /export async function getTripPlansOnce/);
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

  it('uses one-shot trip reads on trip form pages instead of live listeners', () => {
    const tripEdit = readText('src/scripts/pages/trip-edit.ts');
    const accommodation = readText('src/scripts/pages/trip-accommodation.ts');

    assert.match(tripEdit, /getTripOnce/);
    assert.match(accommodation, /getTripOnce/);
    assert.doesNotMatch(tripEdit, /subscribeTrip/);
    assert.doesNotMatch(accommodation, /subscribeTrip/);
  });

  it('uses one-shot reads on the trip plan suggestions page instead of live listeners', () => {
    const page = readText('src/scripts/pages/trip-plan-suggestions.ts');

    assert.match(page, /getTripOnce/);
    assert.match(page, /getTripPlansOnce/);
    assert.doesNotMatch(page, /subscribeTrip/);
    assert.doesNotMatch(page, /subscribeTripPlans/);
  });

  it('uses one-shot reads on the trip AI prompt page instead of live listeners', () => {
    const page = readText('src/scripts/pages/trip-ai-prompt.ts');

    assert.match(page, /getTripOnce/);
    assert.match(page, /getTripPlansOnce/);
    assert.doesNotMatch(page, /subscribeTrip/);
    assert.doesNotMatch(page, /subscribeTripPlans/);
  });

  it('documents one-shot cached reads', () => {
    const docs = readText('docs/firebase-shared-cache.md');

    assert.match(docs, /getTripOnce/);
    assert.match(docs, /lecturas puntuales cacheadas/);
  });
});
