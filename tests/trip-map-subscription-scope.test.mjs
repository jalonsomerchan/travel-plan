import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip map subscription scope usage', () => {
  it('cleans trip, plans and POI listeners on session changes and pagehide', () => {
    const map = readText('src/scripts/pages/trip-map.ts');

    assert.match(map, /createSubscriptionScope/);
    assert.match(map, /const subscriptions = createSubscriptionScope\(\)/);
    assert.match(map, /const resetState = \(\) => \{/);
    assert.match(map, /window\.addEventListener\('pagehide', \(\) => subscriptions\.clear\(\), \{ once: true \}\)/);
    assert.match(map, /observeSession\(\(user\) => \{\n\s*subscriptions\.clear\(\);\n\s*resetState\(\);/);
    assert.match(map, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(map, /subscriptions\.add\(\n\s*subscribeTripPlans\(/);
    assert.match(map, /subscriptions\.add\(\n\s*subscribeTripPointsOfInterest\(/);
  });
});
