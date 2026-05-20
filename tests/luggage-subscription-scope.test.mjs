import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('luggage subscription scope usage', () => {
  it('cleans trip and luggage listeners on session changes and pagehide', () => {
    const luggage = readText('src/scripts/pages/trip-luggage.ts');

    assert.match(luggage, /createSubscriptionScope/);
    assert.match(luggage, /const subscriptions = createSubscriptionScope\(\)/);
    assert.match(luggage, /window\.addEventListener\('pagehide', \(\) => subscriptions\.clear\(\), \{ once: true \}\)/);
    assert.match(luggage, /observeSession\(\(user\) => \{\n\s*subscriptions\.clear\(\);\n\s*resetState\(\);/);
    assert.match(luggage, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(luggage, /subscriptions\.add\(\n\s*subscribeTripLuggageItems\(/);
    assert.match(luggage, /const resetState = \(\) => \{/);
    assert.doesNotMatch(luggage, /datasetLuggageRemove/);
  });
});
