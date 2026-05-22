import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip create redirect flow', () => {
  it('redirects after creating the trip document without waiting for the members subdocument write', () => {
    const trips = readText('src/lib/firebase/trips.ts');
    const tripCreate = readText('src/scripts/pages/trip-create.ts');

    assert.match(trips, /const tripData = \{/);
    assert.match(trips, /setCachedTrip\(/);
    assert.match(trips, /void setDoc\(doc\(db, 'trips', tripRef\.id, 'members', user\.uid\)/);
    assert.doesNotMatch(trips, /await setDoc\(doc\(db, 'trips', tripRef\.id, 'members', user\.uid\)/);
    assert.match(tripCreate, /const tripId = await createTrip\(currentUser, \{/);
    assert.match(tripCreate, /window\.location\.href = getAppUrl\(locale, 'trip', \{ trip: tripId \}\)/);
  });
});
