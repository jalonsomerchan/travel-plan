import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('offline plan writes', () => {
  it('provides non-blocking plan write helpers backed by Firestore', () => {
    const plans = readText('src/lib/firebase/plans.ts');

    assert.match(plans, /setDoc/);
    assert.match(plans, /export function queueCreatePlan/);
    assert.match(plans, /export function queueUpdatePlan/);
    assert.match(plans, /upsertCachedPlan/);
    assert.match(plans, /reportQueuedPlanWrite/);
    assert.match(plans, /\.catch\(reportQueuedPlanWrite\)/);
    assert.match(plans, /return planRef\.id/);
  });

  it('uses queued writes in plan create and edit pages', () => {
    const createPage = readText('src/scripts/pages/plan-create.ts');
    const editPage = readText('src/scripts/pages/plan-edit.ts');

    assert.match(createPage, /queueCreatePlan/);
    assert.match(editPage, /queueUpdatePlan/);
    assert.doesNotMatch(createPage, /await createPlan/);
    assert.doesNotMatch(editPage, /await updatePlan/);
    assert.match(createPage, /window\.location\.href = getAppUrl/);
    assert.match(editPage, /window\.location\.href = getAppUrl/);
  });

  it('documents queued offline plan writes', () => {
    const docs = readText('docs/pwa-offline.md');

    assert.match(docs, /Escrituras offline/);
    assert.match(docs, /queueCreatePlan/);
    assert.match(docs, /queueUpdatePlan/);
    assert.match(docs, /cola local de Firestore/);
  });
});
