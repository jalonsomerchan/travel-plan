import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Mini Trips architecture', () => {
  it('models mini trips as regular trips linked by parentTripId', () => {
    const models = readText('src/lib/app/models.ts');
    const tripsService = readText('src/lib/firebase/trips.ts');
    const rules = readText('firebase/firestore.rules');
    const firebaseGuide = readText('docs/firebase-guide.md');

    assert.match(models, /parentTripId\?: string/);
    assert.match(tripsService, /subscribeChildTrips/);
    assert.match(tripsService, /where\('parentTripId', '==', parentTripId\)/);
    assert.match(rules, /tripData\.parentTripId is string/);
    assert.match(firebaseGuide, /Mini Viajes/);
    assert.match(firebaseGuide, /parentTripId/);
  });

  it('surfaces mini trips from the parent trip page and merges child checklists in the parent checklist view', () => {
    const tripPage = readText('src/components/pages/TripPage.astro');
    const tripScript = readText('src/scripts/pages/trip.ts');
    const sharedScript = readText('src/scripts/pages/shared.ts');
    const checklistPage = readText('src/components/pages/TripChecklistPage.astro');
    const checklistScript = readText('src/scripts/pages/trip-checklist.ts');
    const checklistGroups = readText('src/scripts/pages/trip-checklist-groups.ts');

    assert.match(tripPage, /data-mini-trip-list/);
    assert.match(tripPage, /data-trip-tabs/);
    assert.match(tripPage, /trip-mini-trips-panel/);
    assert.match(tripScript, /renderMiniTrips/);
    assert.match(tripScript, /subscribeChildTrips/);
    assert.match(tripScript, /syncTripPanels/);
    assert.match(tripScript, /trip-create-mini-trip-menu-link/);
    assert.match(sharedScript, /trip-create-mini-trip-menu-link/);
    assert.match(checklistPage, /data-parent-trip-banner/);
    assert.match(checklistScript, /renderChecklistGroups/);
    assert.match(checklistGroups, /data-checklist-trip-id/);
  });
});
