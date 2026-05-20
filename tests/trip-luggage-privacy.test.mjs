import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip luggage privacy', () => {
  it('queries and creates luggage items scoped to the current user', () => {
    const service = readText('src/lib/firebase/luggage.ts');
    const page = readText('src/scripts/pages/trip-luggage.ts');

    assert.match(service, /where\('ownerId', '==', userId\)/);
    assert.match(service, /ownerId: userId/);
    assert.match(page, /subscribeTripLuggageItems\(\s*tripId,\s*user\.uid/);
    assert.match(page, /createTripLuggageItem\(tripId, user\.uid/);
    assert.doesNotMatch(page, /trip\.ownerId !== user\.uid/);
  });

  it('allows trip members to access only their own luggage documents', () => {
    const rules = readText('firebase/firestore.rules');
    const luggageRules = rules.slice(rules.indexOf('match /luggageItems/{luggageItemId}'));
    const guide = readText('docs/firebase-guide.md');

    assert.match(luggageRules, /allow read: if tripVisibleFromParent\(tripId\) &&\s*resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(luggageRules, /allow create: if tripVisibleFromParent\(tripId\) &&\s*request\.resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(luggageRules, /allow update: if tripVisibleFromParent\(tripId\) &&\s*resource\.data\.ownerId == request\.auth\.uid &&\s*request\.resource\.data\.ownerId == request\.auth\.uid/);
    assert.doesNotMatch(luggageRules, /allow read, write: if tripOwnedByCurrentUser\(tripId\)/);
    assert.match(guide, /lista privada de equipaje por persona/);
  });
});
