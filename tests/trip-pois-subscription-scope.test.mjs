import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip POIs subscription scope usage', () => {
  it('cleans trip and POI listeners on session changes and pagehide', () => {
    const pois = readText('src/scripts/pages/trip-pois.ts');

    assert.match(pois, /createSubscriptionScope/);
    assert.match(pois, /const subscriptions = createSubscriptionScope\(\)/);
    assert.match(pois, /window\.addEventListener\('pagehide', \(\) => subscriptions\.clear\(\), \{ once: true \}\)/);
    assert.match(pois, /observeSession\(\(user\) => \{\n\s*subscriptions\.clear\(\);\n\s*currentPoints = \[\];/);
    assert.match(pois, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(pois, /subscriptions\.add\(\n\s*subscribeTripPointsOfInterest\(/);
  });
});
