import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Firebase cache policy', () => {
  it('keeps Firestore offline persistence disabled', () => {
    const config = readText('src/lib/firebase/config.ts');

    assert.match(config, /getFirestore/);
    assert.doesNotMatch(config, /initializeFirestore/);
    assert.doesNotMatch(config, /persistentLocalCache/);
    assert.doesNotMatch(config, /persistentMultipleTabManager/);
  });

  it('keeps the app-level shared cache disabled', () => {
    const cache = readText('src/lib/firebase/shared-data-cache.ts');

    assert.match(cache, /getCachedTrip/);
    assert.match(cache, /getCachedTripPlans/);
    assert.match(cache, /return null/);
    assert.doesNotMatch(cache, /localStorage/);
    assert.doesNotMatch(cache, /sessionStorage/);
    assert.doesNotMatch(cache, /memoryCache/);
  });

  it('uses Firestore snapshots directly without blocking cache metadata', () => {
    const helper = readText('src/lib/firebase/snapshot-freshness.ts');
    const trips = readText('src/lib/firebase/trips.ts');
    const plans = readText('src/lib/firebase/plans.ts');
    const checklists = readText('src/lib/firebase/checklists.ts');
    const luggage = readText('src/lib/firebase/luggage.ts');

    assert.match(helper, /return true/);
    assert.match(trips, /shouldUseSnapshot/);
    assert.match(plans, /shouldUseSnapshot/);
    assert.match(checklists, /shouldUseSnapshot/);
    assert.match(luggage, /shouldUseSnapshot/);
  });

  it('keeps cache cleanup hooks harmless for user changes and sign out', () => {
    const session = readText('src/lib/firebase/session.ts');

    assert.match(session, /clearSharedDataCache/);
    assert.match(session, /currentUserId/);
    assert.match(session, /syncCacheOwner/);
    assert.match(session, /signOutSession/);
  });
});