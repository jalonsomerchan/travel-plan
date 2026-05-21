import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('checklist and luggage item forms', () => {
  it('keeps add forms compact with the button beside the input', () => {
    ['src/components/pages/TripChecklistPage.astro', 'src/components/pages/TripLuggagePage.astro'].forEach((path) => {
      const content = readText(path);

      assert.match(content, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
      assert.match(content, /sm:items-end/);
      assert.doesNotMatch(content, /form\.helper'\)/);
      assert.match(content, /role="status"/);
    });
  });

  it('uses short localized add labels in UI and scripts', () => {
    const checklistPage = readText('src/components/pages/TripChecklistPage.astro');
    const luggagePage = readText('src/components/pages/TripLuggagePage.astro');
    const checklistScript = readText('src/scripts/pages/trip-checklist.ts');
    const luggageScript = readText('src/scripts/pages/trip-luggage.ts');

    assert.match(checklistPage, /tripChecklist\.form\.addShort/);
    assert.match(luggagePage, /tripLuggage\.form\.addShort/);
    assert.match(checklistScript, /tripChecklist\.form\.addShort/);
    assert.match(luggageScript, /tripLuggage\.form\.addShort/);
    assert.equal(existsSync(join(root, 'src/i18n/feature-translations/checklist-forms/es.json')), true);
    assert.equal(existsSync(join(root, 'src/i18n/feature-translations/checklist-forms/en.json')), true);
  });

  it('keeps checklist and luggage add flows non-blocking for consecutive entries', () => {
    const checklistScript = readText('src/scripts/pages/trip-checklist.ts');
    const luggageScript = readText('src/scripts/pages/trip-luggage.ts');

    [checklistScript, luggageScript].forEach((source) => {
      assert.match(source, /form\.reset\(\);/);
      assert.match(source, /setButtonBusy\(button, false, addLabel, t\('common\.saving'\)\);/);
      assert.match(source, /titleInput\?\.focus\(\);/);
      assert.match(source, /catch\(\(error\) => \{/);
    });
  });
});
