import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan create subscription scope usage', () => {
  it('uses the shared scope for the trip listener', () => {
    const planCreate = readText('src/scripts/pages/plan-create.ts');

    assert.match(planCreate, /createSubscriptionScope/);
    assert.match(planCreate, /const subscriptions = createSubscriptionScope/);
    assert.match(planCreate, /pagehide/);
    assert.match(planCreate, /subscriptions\.clear/);
    assert.match(planCreate, /subscriptions\.add\(\n\s*subscribeTrip\(/);
  });
});
