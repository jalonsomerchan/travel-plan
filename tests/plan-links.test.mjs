import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('plan links support', () => {
  it('keeps the plan link model and helpers available', () => {
    const models = readText('src/lib/app/models.ts');
    const helpersPath = 'src/lib/app/plan-links.ts';
    const helpers = readText(helpersPath);

    assert.match(models, /interface PlanLinkRecord/);
    assert.match(models, /links: PlanLinkRecord\[\]/);
    assert.equal(existsSync(join(root, helpersPath)), true, `${helpersPath} should exist`);
    assert.match(helpers, /normalizePlanLinks/);
    assert.match(helpers, /isSafeExternalPlanUrl/);
    assert.match(helpers, /allowedProtocols/);
    assert.match(helpers, /http:/);
    assert.match(helpers, /https:/);
  });

  it('persists links through Firestore mapping and plan forms', () => {
    const firestore = readText('src/lib/firebase/plans.ts');
    const form = readText('src/components/app/PlanFormFields.astro');
    const linksFields = readText('src/components/app/PlanLinksFields.astro');
    const createPage = readText('src/scripts/pages/plan-create.ts');
    const editPage = readText('src/scripts/pages/plan-edit.ts');

    assert.match(firestore, /normalizePlanLinks\(data\.links\)/);
    assert.match(form, /PlanLinksFields/);
    assert.match(linksFields, /name="linkLabel"/);
    assert.match(linksFields, /name="linkUrl"/);
    assert.match(createPage, /withPlanLinksFromForm/);
    assert.match(createPage, /validatePlanLinks/);
    assert.match(editPage, /setPlanLinkRows/);
    assert.match(editPage, /validatePlanLinks/);
  });

  it('shows plan links safely in the plan detail read view', () => {
    const planPage = readText('src/scripts/pages/plan.ts');
    const tripPage = readText('src/scripts/pages/trip.ts');

    assert.match(planPage, /isSafeExternalPlanUrl/);
    assert.match(planPage, /rel="noopener noreferrer"/);
    assert.match(planPage, /target="_blank"/);
    assert.doesNotMatch(tripPage, /getFirstPlanLink/);
    assert.doesNotMatch(tripPage, /isSafeExternalPlanUrl/);
  });

  it('keeps plan link translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/plan-links/es.json');
    const en = readJson('src/i18n/feature-translations/plan-links/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.ok(es['plan.links.title']);
    assert.ok(en['plan.links.invalidUrl']);
    assert.match(ui, /feature-translations\/plan-links\/es\.json/);
    assert.match(ui, /feature-translations\/plan-links\/en\.json/);
  });

  it('documents the Firestore plan links convention', () => {
    const docs = readText('docs/firebase-guide.md');

    assert.match(docs, /links/);
    assert.match(docs, /label/);
    assert.match(docs, /url/);
    assert.match(docs, /noopener noreferrer/);
  });
});
