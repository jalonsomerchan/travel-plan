import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function parseConstString(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*['\"]([^'\"]+)['\"]`));
  assert.ok(match, `Could not find exported const ${name}`);

  return match[1];
}

function parseConstStringArray(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([^\\]]+)\\]`));
  assert.ok(match, `Could not find exported array const ${name}`);

  const values = [...match[1].matchAll(/['\"]([^'\"]+)['\"]/g)].map(([, value]) => value);
  assert.ok(values.length > 0, `${name} should contain at least one value`);

  return values;
}

function getConfiguredI18n() {
  const siteConfig = readText('src/config/site.ts');

  return {
    defaultLocale: parseConstString(siteConfig, 'defaultLocale'),
    locales: parseConstStringArray(siteConfig, 'locales'),
  };
}

describe('project smoke checks', () => {
  it('has the minimum files needed by Astro', () => {
    [
      'package.json',
      'astro.config.mjs',
      'src/pages/index.astro',
      'src/pages/[locale]/index.astro',
      'src/pages/404.astro',
      'src/pages/manifest.webmanifest.ts',
      'src/pages/robots.txt.ts',
      'src/pages/app/map/index.astro',
      'src/pages/app/trip-plan-suggestions/index.astro',
      'src/pages/app/trip-checklist/index.astro',
      'src/pages/app/trip-luggage/index.astro',
      'src/pages/app/trip-accommodation/index.astro',
      'src/pages/app/trip-pois/index.astro',
      'src/pages/[locale]/app/map/index.astro',
      'src/pages/[locale]/app/trip-plan-suggestions/index.astro',
      'src/pages/[locale]/app/trip-checklist/index.astro',
      'src/pages/[locale]/app/trip-luggage/index.astro',
      'src/pages/[locale]/app/trip-accommodation/index.astro',
      'src/pages/[locale]/app/trip-pois/index.astro',
      'src/layouts/BaseLayout.astro',
      'src/config/site.ts',
      'src/i18n/ui.ts',
      'src/i18n/translations',
      'src/utils/paths.ts',
      'src/styles/global.css',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps template metadata files available', () => {
    ['.nvmrc', '.env.example', '.gitignore', '.prettierrc', '.prettierignore', 'README.md'].forEach(
      (path) => {
        assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
      }
    );
  });

  it('keeps the expected npm scripts available', () => {
    const pkg = readJson('package.json');

    assert.equal(pkg.scripts?.dev, 'astro dev');
    assert.equal(pkg.scripts?.build, 'astro build');
    assert.equal(pkg.scripts?.preview, 'astro preview');
    assert.ok(pkg.scripts?.test?.includes('node --test'));
    assert.ok(pkg.scripts?.clean?.includes('scripts/clean.mjs'));
  });

  it('keeps basic template components available', () => {
    ['Button', 'Container', 'Footer', 'Header'].forEach((component) => {
      assert.equal(
        existsSync(join(root, `src/components/${component}.astro`)),
        true,
        `${component}.astro should exist`
      );
    });
  });

  it('keeps the reusable loading component accessible', () => {
    const loadingStatePath = 'src/components/app/LoadingState.astro';
    const loadingState = readText(loadingStatePath);

    assert.equal(existsSync(join(root, loadingStatePath)), true, `${loadingStatePath} should exist`);
    assert.match(loadingState, /role=\"status\"/);
    assert.match(loadingState, /aria-busy=\"true\"/);
    assert.match(loadingState, /sr-only/);
    assert.match(loadingState, /animate-spin/);
  });

  it('keeps the authenticated AI client modules available', () => {
    [
      'src/lib/ai/authenticated-api-client.ts',
      'src/lib/ai/errors.ts',
      'src/lib/ai/json.ts',
      'src/lib/ai/trip-plan-suggestions.ts',
      'src/lib/app/trip-plan-suggestions.ts',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps the Google sign-in button reusable and local', () => {
    const googleButtonPath = 'src/components/app/GoogleSignInButton.astro';
    const googleButton = readText(googleButtonPath);
    const landingPage = readText('src/components/pages/LandingPage.astro');

    assert.equal(existsSync(join(root, googleButtonPath)), true, `${googleButtonPath} should exist`);
    assert.match(googleButton, /viewBox=\"0 0 24 24\"/);
    assert.doesNotMatch(googleButton, /fonts\.googleapis|gstatic|flaticon/);
    assert.match(landingPage, /GoogleSignInButton/);
    assert.match(landingPage, /google-sign-in-form/);
    assert.match(landingPage, /data-auth-session-loading/);
    assert.match(landingPage, /data-google-sign-in-button/);
    assert.match(landingPage, /auth\.checkingSession/);
    assert.match(landingPage, /type=\"submit\"/);
  });

  it('keeps the landing auth check fast and flicker-free', () => {
    const landingScript = readText('src/scripts/pages/landing.ts');
    const session = readText('src/lib/firebase/session.ts');

    assert.match(landingScript, /setSessionCheckVisible\(true\)/);
    assert.match(landingScript, /signInButton\.hidden = isVisible/);
    assert.match(landingScript, /revealSignIn\(\)/);
    assert.match(session, /void trySyncUserProfile\(user\)/);
    assert.doesNotMatch(session, /await trySyncUserProfile\(user\)/);
  });

  it('keeps Astro i18n enabled and aligned with site config', () => {
    const astroConfig = readText('astro.config.mjs');
    const readme = readText('README.md');
    const { defaultLocale, locales } = getConfiguredI18n();

    assert.match(astroConfig, /i18n/);
    assert.match(astroConfig, new RegExp(`defaultLocale:\\s*['\"]${defaultLocale}['\"]`));

    locales.forEach((locale) => {
      assert.match(
        astroConfig,
        new RegExp(`['\"]${locale}['\"]`),
        `${locale} should be configured in Astro i18n locales`
      );
      assert.equal(
        existsSync(join(root, `src/i18n/translations/${locale}.json`)),
        true,
        `${locale}.json should exist`
      );
    });

    assert.match(readme, /Traducciones e idiomas/);
    assert.match(readme, /src\/i18n\/translations/);
  });

  it('keeps translation files aligned with configured locales', () => {
    const { defaultLocale, locales } = getConfiguredI18n();
    const defaultTranslations = readJson(`src/i18n/translations/${defaultLocale}.json`);
    const expectedKeys = Object.keys(defaultTranslations).sort();
    const translationFiles = readdirSync(join(root, 'src/i18n/translations'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));

    assert.deepEqual(
      [...translationFiles].sort(),
      [...locales].sort(),
      'translation JSON files should match configured locales'
    );

    locales.forEach((locale) => {
      const translations = readJson(`src/i18n/translations/${locale}.json`);
      assert.deepEqual(
        Object.keys(translations).sort(),
        expectedKeys,
        `${locale}.json keys should match ${defaultLocale}.json`
      );
      assert.ok(translations['home.title'], `${locale}.json should include home.title`);
      assert.ok(translations['nav.main'], `${locale}.json should include nav.main`);
    });
  });

  it('keeps auth loading feature translations aligned and registered', () => {
    const es = readJson('src/i18n/feature-translations/auth-loading/es.json');
    const en = readJson('src/i18n/feature-translations/auth-loading/en.json');
    const ui = readText('src/i18n/ui.ts');

    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
    assert.equal(es['auth.checkingSession'], 'Iniciando sesión...');
    assert.equal(en['auth.checkingSession'], 'Signing you in...');
    assert.match(ui, /feature-translations\/auth-loading\/es\.json/);
    assert.match(ui, /feature-translations\/auth-loading\/en\.json/);
  });

  it('keeps routing and assets compatible with root and subpath deployments', () => {
    const layout = readText('src/layouts/BaseLayout.astro');
    const manifest = readText('src/pages/manifest.webmanifest.ts');
    const robots = readText('src/pages/robots.txt.ts');
    const i18nHelper = readText('src/i18n/ui.ts');
    const pathHelpers = readText('src/utils/paths.ts');

    [layout, manifest, robots, i18nHelper].forEach((source) => {
      assert.match(source, /withBasePath|getLocalizedPath|stripBasePath/);
      assert.doesNotMatch(source, /href=\"\//);
      assert.doesNotMatch(source, /src=\"\//);
    });

    assert.match(pathHelpers, /withBasePath/);
    assert.match(pathHelpers, /getAbsoluteUrl/);
    assert.match(pathHelpers, /stripBasePath/);
  });

  it('keeps navigation and theme hooks accessible', () => {
    const header = readText('src/components/Header.astro');
    const themeScript = readText('src/scripts/theme.ts');

    assert.match(header, /aria-label=\{t\('nav.main'\)\}/);
    assert.match(header, /data-theme-toggle/);
    assert.match(themeScript, /localStorage/);
    assert.match(themeScript, /prefers-color-scheme/);
  });

  it('keeps homepage content wired to translations', () => {
    const landingPage = readText('src/components/pages/LandingPage.astro');

    assert.match(landingPage, /useTranslations/);
    assert.match(landingPage, /home\.title/);
    assert.match(landingPage, /auth\.signIn/);
  });

  it('keeps firebase config helper isolated from runtime imports', () => {
    const firebaseConfig = readText('src/lib/firebase/config.ts');
    const dashboardScript = readText('src/scripts/pages/dashboard.ts');

    assert.match(firebaseConfig, /initializeApp/);
    assert.match(firebaseConfig, /isFirebaseConfigured/);
    assert.match(dashboardScript, /ensureFirebaseReady/);
  });

  it('keeps CI and Pages workflows available', () => {
    ['.github/workflows/ci.yml', '.github/workflows/pages.yml'].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });
});
