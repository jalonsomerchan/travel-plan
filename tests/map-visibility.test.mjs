import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('map visibility selector', () => {
  it('keeps the visibility panel outside the Leaflet control container', () => {
    const visibility = readText('src/scripts/maps/visibility.ts');

    assert.match(visibility, /document\.body\.append\(panel\)/);
    assert.match(visibility, /map-poi-panel-portal/);
    assert.match(visibility, /positionPortalPanel/);
    assert.match(visibility, /panel\.contains\(target\)/);
    assert.match(visibility, /control\.onRemove/);
    assert.doesNotMatch(visibility, /container\.append\(trigger, panel\)/);
  });

  it('keeps legacy storage compatibility while exposing separate proposed plan visibility', () => {
    const visibility = readText('src/scripts/maps/visibility.ts');
    const tripMap = readText('src/scripts/pages/trip-map.ts');
    const planPage = readText('src/scripts/pages/plan.ts');
    const markers = readText('src/scripts/maps/trip-markers.ts');
    const focus = readText('src/scripts/maps/plan-focus.ts');
    const mobileControls = readText('src/scripts/maps/mobile-controls.ts');

    assert.match(visibility, /travel-plan\.map\.visibility/);
    assert.match(visibility, /legacyPlans/);
    assert.match(visibility, /proposedPlans/);
    assert.match(visibility, /categories/);
    assert.match(visibility, /planCategoryValues/);
    assert.match(visibility, /map\.visibility\.proposedPlans/);
    assert.match(visibility, /map\.visibility\.plans/);
    assert.match(visibility, /map\.visibility\.planTypes/);
    assert.match(visibility, /getPlanCategoryColors/);
    assert.match(visibility, /map-plan-category-swatch/);
    assert.match(tripMap, /splitLocatedPlans/);
    assert.match(tripMap, /visibility\.categories\[plan\.category\]/);
    assert.match(planPage, /splitLocatedPlans/);
    assert.match(planPage, /visibility\.categories\[plan\.category\]/);
    assert.match(planPage, /focusPlanMap/);
    assert.match(markers, /map\.visibility\.goToPlan/);
    assert.match(markers, /class="map-popup-link"/);
    assert.match(focus, /map\.planAccommodationFocus/);
    assert.match(focus, /fitBounds/);
    assert.match(mobileControls, /map-mobile-tools-toggle/);
    assert.match(mobileControls, /aria-expanded/);
    assert.match(planPage, /createPlanMarkerIcon\(currentPlan, locale, \{ emphasized: true \}\)/);
    assert.match(planPage, /createPlanMarkerIcon\(plan, locale, \{ muted: true \}\)/);
    assert.match(planPage, /planAccommodationFocusControl/);
  });
});
