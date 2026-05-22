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
});
