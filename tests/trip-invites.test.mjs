import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip invite flow', () => {
  it('does not pre-read invite documents before sending', () => {
    const source = readText('src/lib/firebase/trips.ts');
    const inviteFunction = source.slice(
      source.indexOf('export async function inviteUserToTrip'),
      source.indexOf('export function subscribePendingInvites'),
    );

    assert.match(source, /import type \{ User \} from 'firebase\/auth'/);
    assert.doesNotMatch(inviteFunction, /getDoc\(/);
    assert.match(inviteFunction, /const inviteRef = doc\(db, 'tripInvites'/);
    assert.match(inviteFunction, /setDoc\(inviteRef/);
    assert.match(inviteFunction, /getInviteId\(tripId, normalizedEmail\)/);
    assert.match(inviteFunction, /status:\s*'pending'/);
  });

  it('keeps Firestore invite rules aligned with owners and recipients', () => {
    const rules = readText('firebase/firestore.rules');

    assert.match(rules, /function tripInviteCreatable\(\)/);
    assert.match(rules, /tripOwnedByCurrentUser\(request\.resource\.data\.tripId\)/);
    assert.match(rules, /request\.resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(rules, /function tripInviteReadable\(\)/);
    assert.match(rules, /resource\.data\.ownerId == request\.auth\.uid/);
    assert.match(rules, /userEmailLower\(\) == resource\.data\.emailLower/);
    assert.match(rules, /allow create: if tripInviteCreatable\(\)/);
    assert.match(rules, /allow update: if tripInviteReadable\(\)/);
  });

  it('keeps the members page using the invite service and visible feedback', () => {
    const page = readText('src/scripts/pages/trip-members.ts');
    const component = readText('src/components/pages/TripMembersPage.astro');

    assert.match(page, /inviteUserToTrip/);
    assert.match(page, /getInviteErrorMessage/);
    assert.match(page, /setMessage\(message, t\('trip\.invite\.sent'\), 'success'\)/);
    assert.match(component, /id="invite-message"/);
  });
});
