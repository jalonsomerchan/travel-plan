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
});
