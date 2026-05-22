import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip shell header', () => {
  it('keeps the trip name in the shared context header and leaves the page title free of it', () => {
    const shared = readText('src/scripts/pages/shared.ts');
    const syncTripShellMatch = shared.match(/export function syncTripShell[\s\S]*?\n}\n\nexport function syncAccommodationShell/);

    assert.ok(syncTripShellMatch, 'syncTripShell should exist');

    const syncTripShell = syncTripShellMatch[0];

    assert.match(syncTripShell, /setTripContextName\(trip\.name\)/);
    assert.match(syncTripShell, /setAppShellDescription\(`\$\{trip\.location\} · \$\{formatTripDateRange\(locale, trip\)\}`\)/);
    assert.match(syncTripShell, /setAppShellMeta\(\[\]\)/);
    assert.doesNotMatch(syncTripShell, /setAppShellTitle\(trip\.name\)/);
    assert.doesNotMatch(syncTripShell, /trip\.ownerEmail/);
    assert.doesNotMatch(syncTripShell, /getTripStatusLabel\(locale, trip\.status\)/);
  });

  it('renders the trip context header component inside the shared app shell', () => {
    const appShell = readText('src/components/app/AppShell.astro');
    const tripPage = readText('src/components/pages/TripPage.astro');

    assert.match(appShell, /import TripContextHeader from '\.\/TripContextHeader\.astro';/);
    assert.match(appShell, /<TripContextHeader tripName=\{tripContextName\}>/);
    assert.match(appShell, /<slot name="trip-context-action" \/>/);
    assert.match(tripPage, /<AppShell\s+tripContext/);
    assert.match(tripPage, /<TripActionsMenu slot="trip-context-action"/);
  });
});
