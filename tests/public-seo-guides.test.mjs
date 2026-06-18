import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('public SEO guide pages', () => {
  it('keeps generated guide data registered and modular', () => {
    [
      'src/data/public-guide-types.ts',
      'src/data/public-seo-generated-guides.ts',
      'src/data/public-seo-pages.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });

    const generatedGuides = readText('src/data/public-seo-generated-guides.ts');
    const publicSeoPages = readText('src/data/public-seo-pages.ts');

    assert.match(generatedGuides, /guideThemes/);
    assert.match(generatedGuides, /guideAudiences/);
    assert.match(generatedGuides, /buildTopics\('es'\)/);
    assert.match(generatedGuides, /Consejos prácticos/);
    assert.match(generatedGuides, /How TravelPlan helps/);
    assert.match(publicSeoPages, /publicSeoGuidePageIds/);
    assert.match(publicSeoPages, /publicSeoGuidePages/);
  });

  it('keeps enough guide combinations to generate about one hundred localized pages', () => {
    const generatedGuides = readText('src/data/public-seo-generated-guides.ts');
    const themeCount = (generatedGuides.match(/titlePrefix:/g) ?? []).length;
    const audienceCount = (generatedGuides.match(/context:/g) ?? []).length;

    assert.equal(themeCount, 20);
    assert.equal(audienceCount, 10);
    assert.equal((themeCount / 2) * (audienceCount / 2) * 2, 100);
  });

  it('links more public guides from the home page', () => {
    const landingPage = readText('src/components/pages/LandingPage.astro');

    assert.match(landingPage, /slice\(6, 36\)/);
    assert.match(landingPage, /getPublicPages/);
    assert.match(landingPage, /getPublicPagePath/);
  });
});
