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
  'src/components/pages/TripPlanSuggestionsPage.astro',
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

  it('keeps the trip weather card compact with larger icon and inline temperatures', () => {
    const tripPage = readText('src/components/pages/TripPage.astro');
    const tripScript = readText('src/scripts/pages/trip.ts');

    assert.match(tripPage, /\.trip-weather-day-meta/);
    assert.match(tripPage, /\.weather-icon-svg\s*\{\s*width: 3\.35rem;/);
    assert.match(tripPage, /\.trip-weather-day-temperatures strong,\s*\.trip-weather-day-temperatures em/);
    assert.match(tripScript, /trip-weather-day-meta/);
    assert.match(tripScript, /<span aria-hidden="true">\|<\/span>/);
    assert.match(tripScript, /<em>\$\{escapeHtml\(formatTemperature\(day\.temperatureMin, dataset\.temperatureUnit\)\)\}<\/em>/);
  });

  it('keeps the weather page day and hour rows using the same compact weather distribution', () => {
    const weatherPage = readText('src/components/pages/TripWeatherPage.astro');
    const weatherScript = readText('src/scripts/pages/trip-weather.ts');

    assert.match(weatherPage, /\.trip-weather-day-main\s*\{\s*display: grid;\s*grid-template-columns: auto minmax\(0, 1fr\) auto;/);
    assert.match(weatherPage, /\.trip-weather-hour-main\s*\{\s*display: grid;\s*grid-template-columns: auto minmax\(0, 1fr\) auto;/);
    assert.match(weatherPage, /\.trip-weather-day-temperatures strong,\s*\.trip-weather-day-temperatures em,/);
    assert.match(weatherPage, /\.weather-icon-svg\s*\{\s*width: 3\.2rem;/);
    assert.match(weatherScript, /trip-weather-day-temperatures trip-weather-day-temperatures--inline/);
    assert.match(weatherScript, /trip-weather-hour-temperatures trip-weather-hour-temperatures--inline/);
    assert.match(weatherScript, /<span aria-hidden="true">\|<\/span>/);
  });
});
