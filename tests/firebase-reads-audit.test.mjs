import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Firebase reads audit', () => {
  it('documents when to use cached reads and realtime listeners', () => {
    const docs = readText('docs/firebase-reads-audit.md');

    assert.match(docs, /Lecturas puntuales cacheadas/);
    assert.match(docs, /Listeners en tiempo real/);
    assert.match(docs, /getTripOnce/);
    assert.match(docs, /getPlanOnce/);
    assert.match(docs, /getTripPlansOnce/);
    assert.match(docs, /createSubscriptionScope/);
  });

  it('keeps common form and AI pages on cached one-shot reads', () => {
    const pages = [
      'src/scripts/pages/plan-create.ts',
      'src/scripts/pages/plan-edit.ts',
      'src/scripts/pages/trip-edit.ts',
      'src/scripts/pages/trip-accommodation.ts',
      'src/scripts/pages/trip-plan-suggestions.ts',
      'src/scripts/pages/trip-ai-prompt.ts',
    ];

    pages.forEach((pagePath) => {
      const page = readText(pagePath);
      assert.doesNotMatch(page, /subscribeTrip\(/, pagePath);
      assert.doesNotMatch(page, /subscribeTripPlans\(/, pagePath);
    });
  });
});
