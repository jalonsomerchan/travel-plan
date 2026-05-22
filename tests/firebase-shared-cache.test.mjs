import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Firebase shared data cache', () => {
  it('keeps a small shared cache helper for trip and plan data', () => {
    const cache = readText('src/lib/firebase/shared-data-cache.ts');

    assert.match(cache, /travel-plan:shared-cache:v2/);
    assert.match(cache, /localStorage/);
    assert.doesNotMatch(cache, /sessionStorage/);
    assert.match(cache, /persistentCacheMaxAgeMs/);
    assert.match(cache, /canUseStoredValue/);
    assert.match(cache, /navigator\.onLine === false/);
    assert.match(cache, /memoryCache/);
    assert.match(cache, /getCachedTrip/);
    assert.match(cache, /setCachedTrip/);
    assert.match(cache, /clearCachedTrip/);
    assert.match(cache, /getCachedTripPlans/);
    assert.match(cache, /setCachedTripPlans/);
    assert.match(cache, /clearSharedDataCache/);
  });

  it('uses cached trips as initial values and refreshes them from snapshots', () => {
    const trips = readText('src/lib/firebase/trips.ts');

    assert.match(trips, /getCachedTrip/);
    assert.match(trips, /setCachedTrip/);
    assert.match(trips, /clearCachedTrip/);
    assert.match(trips, /queueMicrotask\(\(\) => callback\(cachedTrip\)\)/);
    assert.match(trips, /trips\.forEach\(setCachedTrip\)/);
    assert.match(trips, /clearCachedTrip\(tripId\)/);
    assert.match(trips, /clearCachedTrip\(invite\.tripId\)/);
  });

  it('uses cached trip plans as initial values and invalidates them on mutations', () => {
    const plans = readText('src/lib/firebase/plans.ts');

    assert.match(plans, /getCachedTripPlans/);
    assert.match(plans, /setCachedTripPlans/);
    assert.match(plans, /clearCachedTripPlans/);
    assert.match(plans, /queueMicrotask\(\(\) => callback\(cachedPlans\)\)/);
    assert.match(plans, /clearCachedTripPlans\(tripId\)/);
  });

  it('clears shared cache on user changes and sign out', () => {
    const session = readText('src/lib/firebase/session.ts');

    assert.match(session, /clearSharedDataCache/);
    assert.match(session, /currentUserId/);
    assert.match(session, /syncCacheOwner/);
    assert.match(session, /signOutSession/);
  });

  it('documents the shared cache convention', () => {
    const docs = readText('docs/firebase-shared-cache.md');

    assert.match(docs, /shared-data-cache\.ts/);
    assert.match(docs, /Datos de un viaje/);
    assert.match(docs, /localStorage/);
    assert.match(docs, /Safari iOS|iPhone/);
    assert.match(docs, /online/);
    assert.match(docs, /offline/);
    assert.match(docs, /createSubscriptionScope/);
  });
});