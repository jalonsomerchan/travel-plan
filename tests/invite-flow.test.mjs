import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip invite privacy flow', () => {
  it('does not query user profiles by email when inviting', () => {
    const tripsSource = readText('src/lib/firebase/trips.ts');
    const inviteFunction = tripsSource.slice(
      tripsSource.indexOf('export async function inviteUserToTrip'),
      tripsSource.indexOf('export function subscribePendingInvites'),
    );

    assert.doesNotMatch(inviteFunction, /collection\(db, ['"]users['"]\)/);
    assert.doesNotMatch(inviteFunction, /where\(['"]emailLower['"], ['"]==['"]/);
    assert.match(inviteFunction, /tripInvites/);
    assert.match(inviteFunction, /getInviteId\(tripId, normalizedEmail\)/);
    assert.match(inviteFunction, /setDoc\(inviteRef/);
  });

  it('assigns the authenticated user when accepting an invite', () => {
    const tripsSource = readText('src/lib/firebase/trips.ts');
    const acceptFunction = tripsSource.slice(tripsSource.indexOf('export async function acceptInvite'));

    assert.match(acceptFunction, /userEmail !== invite\.emailLower/);
    assert.match(acceptFunction, /members', user\.uid/);
    assert.match(acceptFunction, /memberIds: arrayUnion\(user\.uid\)/);
    assert.match(acceptFunction, /userId: user\.uid/);
  });

  it('documents invite rules without exposing users lookups', () => {
    const guide = readText('docs/firebase-guide.md');

    assert.match(guide, /El cliente no consulta `users`/);
    assert.match(guide, /tripInvites\/\{tripId_emailLower\}/);
    assert.match(guide, /inviteRecipient/);
    assert.match(guide, /Missing or insufficient permissions/);
  });
});
