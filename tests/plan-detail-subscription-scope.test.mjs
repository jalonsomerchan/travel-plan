import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan detail subscription scope usage', () => {
  it('uses scopes for trip, plan and trip POI listeners', () => {
    const plan = readText('src/scripts/pages/plan.ts');

    assert.match(plan, /createSubscriptionScope/);
    assert.match(plan, /const subscriptions = createSubscriptionScope/);
    assert.match(plan, /const planSubscriptions = createSubscriptionScope/);
    assert.match(plan, /clearSubscriptions/);
    assert.match(plan, /resetState/);
    assert.match(plan, /pagehide/);
    assert.match(plan, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(plan, /planSubscriptions\.clear\(\);\n\s*currentPlan = null/);
    assert.match(plan, /planSubscriptions\.add\(\n\s*subscribePlan\(/);
    assert.match(plan, /subscriptions\.add\(\n\s*subscribeTripPointsOfInterest\(/);
  });
});
