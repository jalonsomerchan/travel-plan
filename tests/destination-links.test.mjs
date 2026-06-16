import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

describe('destination useful links', () => {
  it('defines a compact destination link model and helpers', () => {
    const models = readText('src/lib/app/models.ts');
    const helpers = readText('src/lib/app/destination-links.ts');

    assert.match(models, /interface DestinationLinkRecord/);
    assert.match(models, /interface DestinationLinkInput/);
    assert.match(models, /destinationLinks: DestinationLinkRecord\[\]/);
    assert.match(helpers, /normalizeDestinationLinkInput/);
    assert.match(helpers, /normalizeDestinationLinks/);
    assert.match(helpers, /validateDestinationLink/);
    assert.match(helpers, /sortDestinationLinks/);
  });

  it('reuses the shared external URL sanitizer and safe URL validation', () => {
    const planLinks = readText('src/lib/app/plan-links.ts');
    const helpers = readText('src/lib/app/destination-links.ts');

    assert.match(planLinks, /sanitizeExternalLinkUrl/);
    assert.match(planLinks, /isSafeExternalUrl/);
    assert.match(helpers, /sanitizeExternalLinkUrl/);
    assert.match(helpers, /isSafeExternalUrl/);
  });

  it('stores useful links on the trip document for existing rule compatibility', () => {
    const persistence = readText('src/lib/firebase/destination-links.ts');
    const trips = readText('src/lib/firebase/trips.ts');
    const tripReads = readText('src/lib/firebase/trip-reads.ts');

    assert.match(persistence, /destinationLinks/);
    assert.match(persistence, /doc\(db, 'trips', tripId\)/);
    assert.match(persistence, /updateDoc/);
    assert.match(persistence, /normalizeDestinationLinks/);
    assert.match(trips, /destinationLinks: normalizeDestinationLinks\(data\.destinationLinks\)/);
    assert.match(tripReads, /destinationLinks: normalizeDestinationLinks\(data\.destinationLinks\)/);
    assert.doesNotMatch(persistence, /collection\(db, 'trips', tripId, 'destinationLinks'\)/);
    assert.doesNotMatch(persistence, /onSnapshot/);
  });

  it('mounts an accessible editable section on the trip page', () => {
    const mount = readText('src/scripts/pages/trip-mini-trips-fallback.ts');
    const pageScript = readText('src/scripts/pages/trip-destination-links.ts');

    assert.match(mount, /mountTripDestinationLinks/);
    assert.match(pageScript, /data-destination-links-section/);
    assert.match(pageScript, /subscribeTripMembers/);
    assert.match(pageScript, /trip\?\.destinationLinks/);
    assert.match(pageScript, /_blank/);
    assert.match(pageScript, /noopener noreferrer/);
    assert.match(pageScript, /validateDestinationLink/);
  });

  it('keeps destination link translations aligned and registered', () => {
    const esPath = 'src/i18n/feature-translations/destination-links/es.json';
    const enPath = 'src/i18n/feature-translations/destination-links/en.json';
    const es = readJson(esPath);
    const en = readJson(enPath);
    const ui = readText('src/i18n/ui.ts');

    assert.equal(existsSync(join(root, esPath)), true);
    assert.equal(existsSync(join(root, enPath)), true);
    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.match(ui, /feature-translations\/destination-links\/es\.json/);
    assert.match(ui, /feature-translations\/destination-links\/en\.json/);
  });

  it('documents the destinationLinks field decision', () => {
    const docs = readText('docs/destination-links.md');

    assert.match(docs, /destinationLinks/);
    assert.match(docs, /trips\/\{tripId\}/);
    assert.match(docs, /noopener noreferrer/);
  });
});
