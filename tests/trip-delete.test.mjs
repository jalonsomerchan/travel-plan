import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip delete flow', () => {
  it('exposes trip deletion from edit page and firebase service', () => {
    const tripEditPage = readText('src/components/pages/TripEditPage.astro');
    const tripEditScript = readText('src/scripts/pages/trip-edit.ts');
    const tripsService = readText('src/lib/firebase/trips.ts');

    assert.match(tripEditPage, /data-trip-delete-button/);
    assert.match(tripEditScript, /window\.confirm\(t\('tripEdit\.deleteConfirm'\)\)/);
    assert.match(tripEditScript, /await deleteTrip\(tripId\)/);
    assert.match(tripsService, /export async function deleteTrip/);
    assert.match(tripsService, /deletedAt: serverTimestamp\(\)/);
    assert.match(tripsService, /status: 'deleted'/);
    assert.match(tripsService, /tripInvites/);
    assert.match(tripsService, /isTripDeletedData/);
  });
});
