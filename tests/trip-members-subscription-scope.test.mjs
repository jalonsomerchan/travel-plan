import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('trip members subscription scope usage', () => {
  it('cleans trip, members and invite listeners on session changes and pagehide', () => {
    const members = readText('src/scripts/pages/trip-members.ts');

    assert.match(members, /createSubscriptionScope/);
    assert.match(members, /const subscriptions = createSubscriptionScope\(\)/);
    assert.match(members, /const inviteSubscriptions = createSubscriptionScope\(\)/);
    assert.match(members, /window\.addEventListener\('pagehide', clearSubscriptions, \{ once: true \}\)/);
    assert.match(members, /observeSession\(\(user\) => \{\n\s*clearSubscriptions\(\);\n\s*resetState\(\);/);
    assert.match(members, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(members, /subscriptions\.add\(\n\s*subscribeTripMembers\(/);
    assert.match(members, /inviteSubscriptions\.clear\(\);\n\s*currentInvites = \[\];/);
    assert.match(members, /inviteSubscriptions\.add\(\n\s*subscribeTripInvites\(/);
  });
});
