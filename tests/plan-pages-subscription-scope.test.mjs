import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan pages subscription scope usage', () => {
  it('uses scopes for plan detail trip, plan and trip POI listeners', () => {
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

  it('uses a scope for plan edit trip and plan listeners', () => {
    const edit = readText('src/scripts/pages/plan-edit.ts');

    assert.match(edit, /createSubscriptionScope/);
    assert.match(edit, /const subscriptions = createSubscriptionScope/);
    assert.match(edit, /pagehide/);
    assert.match(edit, /subscriptions\.clear/);
    assert.match(edit, /currentTrip = null/);
    assert.match(edit, /currentPlan = null/);
    assert.match(edit, /subscriptions\.add\(\n\s*subscribeTrip\(/);
    assert.match(edit, /subscriptions\.add\(\n\s*subscribePlan\(/);
  });
});
