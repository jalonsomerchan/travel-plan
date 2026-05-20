import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Firebase subscription scope helper', () => {
  it('keeps a small helper to register and clear unsubscribe callbacks', () => {
    const helper = readText('src/lib/firebase/subscription-scope.ts');

    assert.match(helper, /export type Unsubscribe = \(\) => void/);
    assert.match(helper, /createSubscriptionScope/);
    assert.match(helper, /new Set<Unsubscribe>/);
    assert.match(helper, /add\(unsubscribe: Unsubscribe \| null \| undefined\)/);
    assert.match(helper, /clear\(\)/);
    assert.match(helper, /size\(\)/);
  });

  it('clears callbacks and is safe to clear more than once in the reference implementation', () => {
    const helper = readText('src/lib/firebase/subscription-scope.ts');

    assert.match(helper, /unsubscribers\.forEach\(\(unsubscribe\) => \{/);
    assert.match(helper, /unsubscribe\(\)/);
    assert.match(helper, /unsubscribers\.clear\(\)/);
  });

  it('is used by the checklist page to avoid duplicate active listeners', () => {
    const checklist = readText('src/scripts/pages/trip-checklist.ts');

    assert.match(checklist, /createSubscriptionScope/);
    assert.match(checklist, /const subscriptions = createSubscriptionScope\(\)/);
    assert.match(checklist, /window\.addEventListener\('pagehide', \(\) => subscriptions\.clear\(\), \{ once: true \}\)/);
    assert.match(checklist, /observeSession\(\(user\) => \{\n\s*subscriptions\.clear\(\)/);
    assert.match(checklist, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(checklist, /subscriptions\.add\(\n\s*subscribeTripChecklistItems\(/);
  });
});
