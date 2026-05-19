import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function parsePlanCategories() {
  const models = readText('src/lib/app/models.ts');
  const match = models.match(/export\s+const\s+planCategoryValues\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, 'planCategoryValues should exist');

  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(([, value]) => value);
}

describe('plan category color configuration', () => {
  it('defines one color entry for every plan category', () => {
    const categories = parsePlanCategories();
    const colorConfig = readText('src/lib/app/plan-category-colors.ts');

    categories.forEach((category) => {
      assert.match(colorConfig, new RegExp(`${category}:\\s*\\{`), `${category} should have colors`);
    });

    assert.match(colorConfig, /defaultPlanCategory/);
    assert.match(colorConfig, /getPlanCategoryColors/);
    assert.match(colorConfig, /getPlanCategoryDotStyle/);
  });

  it('reuses category colors in lists, calendars and maps', () => {
    [
      'src/scripts/pages/trip.ts',
      'src/scripts/pages/trip-map.ts',
      'src/scripts/pages/trip-calendar.ts',
      'src/scripts/pages/global-calendar.ts',
    ].forEach((path) => {
      assert.match(readText(path), /plan-category-colors/, `${path} should reuse plan category colors`);
    });
  });
});
