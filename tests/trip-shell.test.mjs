import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip shell header', () => {
  it('shows location and dates together and hides secondary trip metadata', () => {
    const shared = readText('src/scripts/pages/shared.ts');
    const syncTripShellMatch = shared.match(/export function syncTripShell[\s\S]*?\n}\n\nexport function syncAccommodationShell/);

    assert.ok(syncTripShellMatch, 'syncTripShell should exist');

    const syncTripShell = syncTripShellMatch[0];

    assert.match(syncTripShell, /setAppShellDescription\(`\$\{trip\.location\} · \$\{formatTripDateRange\(locale, trip\)\}`\)/);
    assert.match(syncTripShell, /setAppShellMeta\(\[\]\)/);
    assert.doesNotMatch(syncTripShell, /trip\.ownerEmail/);
    assert.doesNotMatch(syncTripShell, /getTripStatusLabel\(locale, trip\.status\)/);
  });
});
