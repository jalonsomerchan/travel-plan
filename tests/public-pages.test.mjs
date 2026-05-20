import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('public information pages', () => {
  it('keeps reusable public page files available', () => {
    [
      'src/components/pages/PublicInfoPage.astro',
      'src/data/public-pages.ts',
      'src/data/public-page-ui.ts',
      'src/data/public-page-routing.ts',
      'src/pages/[slug]/index.astro',
      'src/pages/[locale]/[slug]/index.astro',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('defines the expected public page ids and localized slugs', () => {
    const publicPages = readText('src/data/public-pages.ts');

    ['about', 'privacy', 'faq', 'features', 'how-it-works', 'manual'].forEach((id) => {
      assert.match(publicPages, new RegExp(`['\"]${id}['\"]`));
    });

    ['acerca-de', 'privacidad', 'preguntas-frecuentes', 'funciones-principales', 'como-funciona', 'manual'].forEach((slug) => {
      assert.match(publicPages, new RegExp(`slug:\\s*['\"]${slug}['\"]`));
    });

    ['about', 'privacy', 'faq', 'main-features', 'how-it-works', 'manual'].forEach((slug) => {
      assert.match(publicPages, new RegExp(`slug:\\s*['\"]${slug}['\"]`));
    });
  });

  it('uses localized paths and semantic structure on public pages', () => {
    const page = readText('src/components/pages/PublicInfoPage.astro');

    assert.match(page, /BaseLayout/);
    assert.match(page, /getLocalizedPath/);
    assert.match(page, /<article/);
    assert.match(page, /<h1/);
    assert.match(page, /aria-current/);
    assert.doesNotMatch(page, /href="\//);
  });

  it('links public pages from the footer without hardcoding root-relative URLs', () => {
    const footer = readText('src/components/Footer.astro');

    assert.match(footer, /getPublicPages/);
    assert.match(footer, /getPublicPagePath/);
    assert.match(footer, /getLocalizedPath/);
    assert.match(footer, /publicPageUi\.navLabel/);
    assert.doesNotMatch(footer, /href="\//);
  });

  it('builds localized static paths for default and secondary locales', () => {
    const defaultRoute = readText('src/pages/[slug]/index.astro');
    const localizedRoute = readText('src/pages/[locale]/[slug]/index.astro');

    assert.match(defaultRoute, /getStaticPaths/);
    assert.match(defaultRoute, /defaultLocale/);
    assert.match(defaultRoute, /getPublicPageBySlug/);
    assert.match(localizedRoute, /locales/);
    assert.match(localizedRoute, /defaultLocale/);
    assert.match(localizedRoute, /isLocale/);
    assert.match(localizedRoute, /getPublicPageBySlug/);
  });
});
