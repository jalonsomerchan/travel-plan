import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan statuses', () => {
  it('keeps the proposed status wired through models, translations and shared labels', () => {
    const models = readText('src/lib/app/models.ts');
    const shared = readText('src/scripts/pages/shared.ts');
    const es = readText('src/i18n/translations/es.json');
    const en = readText('src/i18n/translations/en.json');

    assert.match(models, /'proposed'/);
    assert.match(shared, /status === 'proposed'/);
    assert.match(es, /"status\.plan\.proposed": "Propuesto"/);
    assert.match(en, /"status\.plan\.proposed": "Proposed"/);
  });

  it('renders the compact plan card actions for proposed, pending and completed states', () => {
    const tripPage = readText('src/scripts/pages/trip.ts');

    assert.match(tripPage, /trip\.planCard\.markProposed/);
    assert.match(tripPage, /trip\.planCard\.markPending/);
    assert.match(tripPage, /trip\.planCard\.markVisited/);
    assert.match(tripPage, /data-plan-status-action/);
    assert.match(tripPage, /data-plan-delete-action/);
    assert.match(tripPage, /trip\.planCard\.type/);
    assert.match(tripPage, /trip\.planCard\.date/);
    assert.match(tripPage, /trip\.planCard\.distance/);
  });
});
