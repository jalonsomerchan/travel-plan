import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard mini trips rendering', () => {
  it('groups mini trips below their parent trip with a visual indent', () => {
    const dashboard = readText('src/scripts/pages/dashboard.ts');

    assert.match(dashboard, /childTripsByParentId/);
    assert.match(dashboard, /rootTrips/);
    assert.match(dashboard, /renderTripCard/);
    assert.match(dashboard, /ml-5 border-l-4 border-l-\[var\(--color-primary-soft\)\] pl-4 sm:ml-8/);
    assert.match(dashboard, /trip\.parentTripId/);
  });

  it('falls back to authenticated Firestore REST reads when the SDK returns an empty offline snapshot', () => {
    const dashboard = readText('src/scripts/pages/dashboard.ts');
    const rest = readText('src/lib/firebase/trip-rest.ts');

    assert.match(dashboard, /fetchUserTripsDirect/);
    assert.match(dashboard, /renderDirectTripsFallback/);
    assert.match(dashboard, /received-direct/);
    assert.match(rest, /documents:runQuery/);
    assert.match(rest, /Authorization: `Bearer \$\{token\}`/);
    assert.match(rest, /ARRAY_CONTAINS/);
    assert.match(rest, /ownerId/);
  });
});
