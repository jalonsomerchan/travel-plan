import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard and invites subscription scope usage', () => {
  it('uses a shared scope for dashboard trips and invite listeners', () => {
    const dashboard = readText('src/scripts/pages/dashboard.ts');

    assert.match(dashboard, /createSubscriptionScope/);
    assert.match(dashboard, /const subscriptions = createSubscriptionScope/);
    assert.match(dashboard, /pagehide/);
    assert.match(dashboard, /subscriptions\.clear/);
    assert.match(dashboard, /subscriptions\.add\(\n\s*subscribeUserTrips\(/);
    assert.match(dashboard, /subscriptions\.add\(\n\s*subscribePendingInvites\(/);
  });

  it('uses a shared scope for the pending invites page listener', () => {
    const invites = readText('src/scripts/pages/trip-invites.ts');

    assert.match(invites, /createSubscriptionScope/);
    assert.match(invites, /const subscriptions = createSubscriptionScope/);
    assert.match(invites, /pagehide/);
    assert.match(invites, /subscriptions\.clear/);
    assert.match(invites, /subscriptions\.add\(\n\s*subscribePendingInvites\(/);
  });
});
