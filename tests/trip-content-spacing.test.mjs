import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

const updatedTripPages = [
  'src/components/pages/TripPage.astro',
  'src/components/pages/TripCalendarPage.astro',
  'src/components/pages/TripChecklistPage.astro',
  'src/components/pages/TripLuggagePage.astro',
  'src/components/pages/TripAccommodationPage.astro',
  'src/components/pages/TripMembersPage.astro',
  'src/components/pages/TripMapPage.astro',
  'src/components/pages/TripPoisPage.astro',
  'src/components/pages/PlanPage.astro',
  'src/components/pages/PlanCreatePage.astro',
  'src/components/pages/PlanEditPage.astro',
];

describe('trip content spacing', () => {
  it('does not add an extra top border after the trip section menu', () => {
    updatedTripPages.forEach((path) => {
      const content = readText(path);

      assert.doesNotMatch(
        content,
        /slot="body" class="mt-8 border-t border-\[var\(--color-border\)\] pt-6"/,
        `${path} should start the body with compact spacing`,
      );
      assert.match(content, /slot="body" class="pt-6"/, `${path} should keep body top padding`);
    });
  });

  it('keeps the trip map page focused on the map without duplicated headings', () => {
    const mapPage = readText('src/components/pages/TripMapPage.astro');

    assert.doesNotMatch(mapPage, /data-map-trip-name/);
    assert.doesNotMatch(mapPage, /<h2 class="mt-3 text-3xl font-black">\{t\('map\.canvasTitle'\)\}<\/h2>/);
    assert.match(mapPage, /data-trip-map-canvas/);
    assert.match(mapPage, /data-map-count/);
  });
});
