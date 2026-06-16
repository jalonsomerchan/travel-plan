import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('manual plan day order support', () => {
  it('keeps the optional dayOrder field in the plan model', () => {
    const models = readText('src/lib/app/models.ts');

    assert.match(models, /dayOrder\?: number/);
  });

  it('centralizes schedule and manual order helpers', () => {
    const helperPath = 'src/lib/app/plan-order.ts';
    const helper = readText(helperPath);

    assert.equal(existsSync(join(root, helperPath)), true);
    assert.match(helper, /PLAN_DAY_ORDER_STEP/);
    assert.match(helper, /getPlanDayKey/);
    assert.match(helper, /sortPlansByScheduleAndDayOrder/);
    assert.match(helper, /getPlanDayOrderUpdates/);
  });

  it('persists dayOrder through Firestore reads and batched updates', () => {
    const writes = readText('src/lib/firebase/plans.ts');
    const reads = readText('src/lib/firebase/plan-reads.ts');

    assert.match(writes, /dayOrder/);
    assert.match(writes, /writeBatch/);
    assert.match(writes, /updatePlanDayOrders/);
    assert.match(writes, /sortPlansByScheduleAndDayOrder/);
    assert.match(reads, /dayOrder/);
    assert.match(reads, /sortPlansByScheduleAndDayOrder/);
  });

  it('adds accessible up and down controls with edit permission checks', () => {
    const script = readText('src/scripts/pages/trip-plan-order.ts');
    const mount = readText('src/scripts/pages/trip-mini-trips-fallback.ts');

    assert.match(script, /data-plan-order-action/);
    assert.match(script, /aria-live/);
    assert.match(script, /subscribeTripMembers/);
    assert.match(script, /userCanEditTrip/);
    assert.match(script, /getPlanDayOrderUpdates/);
    assert.match(script, /updatePlanDayOrders/);
    assert.match(script, /locale === 'en'/);
    assert.match(mount, /mountTripPlanOrder/);
  });
});
