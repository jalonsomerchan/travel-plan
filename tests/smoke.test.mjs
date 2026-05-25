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
      'src/pages/app/checklists/index.astro',
      'src/pages/app/trip-plan-suggestions/index.astro',
      'src/pages/app/trip-checklist/index.astro',
      'src/pages/app/trip-luggage/index.astro',
      'src/pages/app/trip-weather/index.astro',
      'src/pages/app/trip-accommodation/index.astro',
      'src/pages/app/trip-pois/index.astro',
      'src/pages/app/trip-pois-ai/index.astro',
      'src/pages/[locale]/app/map/index.astro',
      'src/pages/[locale]/app/checklists/index.astro',
      'src/pages/[locale]/app/trip-plan-suggestions/index.astro',
      'src/pages/[locale]/app/trip-checklist/index.astro',
      'src/pages/[locale]/app/trip-luggage/index.astro',
      'src/pages/[locale]/app/trip-weather/index.astro',
      'src/pages/[locale]/app/trip-accommodation/index.astro',
      'src/pages/[locale]/app/trip-pois/index.astro',
      'src/pages/[locale]/app/trip-pois-ai/index.astro',
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

  it('shows the package version in the footer', () => {
    const siteConfig = readText('src/config/site.ts');
    const footer = readText('src/components/Footer.astro');
    const ui = readText('src/i18n/ui.ts');
    const es = readJson('src/i18n/feature-translations/footer-version/es.json');
    const en = readJson('src/i18n/feature-translations/footer-version/en.json');

    assert.match(siteConfig, /package\.json/);
    assert.match(siteConfig, /version:\s*packageJson\.version/);
    assert.match(footer, /footer\.version/);
    assert.match(footer, /siteConfig\.version/);
    assert.match(ui, /feature-translations\/footer-version\/es\.json/);
    assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
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
    const sessionSource = readText('src/lib/firebase/session.ts');

    assert.match(landingScript, /setSessionCheckVisible\(true\)/);
    assert.match(landingScript, /signInButton\.hidden = isVisible/);
    assert.match(landingScript, /revealSignIn\(\)/);
    assert.match(sessionSource, /void trySyncUserProfile\(user\)/);
    assert.doesNotMatch(sessionSource, /await trySyncUserProfile\(user\)/);
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
    assert.match(pathHelpers, /stripBasePath/);
    assert.match(pathHelpers, /getAbsoluteUrl/);
    assert.match(manifest, /start_url/);
    assert.match(robots, /sitemap-index\.xml/);
  });

  it('keeps starter links and labels configurable or translated', () => {
    const siteConfig = readText('src/config/site.ts');
    const header = readText('src/components/Header.astro');
    const landingPage = readText('src/components/pages/LandingPage.astro');
    const envExample = readText('.env.example');

    assert.match(siteConfig, /repositoryUrl/);
    assert.match(envExample, /PUBLIC_REPOSITORY_URL/);
    assert.match(envExample, /PUBLIC_FIREBASE_API_KEY/);
    assert.match(header, /t\('nav\.main'\)/);
    assert.match(landingPage, /t\('home\.title'\)/);
    assert.match(landingPage, /t\('auth\.signIn'\)/);
    assert.doesNotMatch(landingPage, /https:\/\/github\.com\/jalonsomerchan\/astro-template/);
  });

  it('keeps repository links pointing at the current repository by default', () => {
    const sources = [
      readText('src/config/site.ts'),
      readText('.env.example'),
      readText('README.md'),
      readText('docs/firebase-guide.md'),
    ].join('\n');

    assert.match(sources, /https:\/\/github\.com\/jalonsomerchan\/travel-plan/);
    assert.doesNotMatch(sources, /https:\/\/github\.com\/jorgealonso\/travel-plan/);
  });

  it('keeps new-tab external links protected with noopener', () => {
    const tripPageScript = readText('src/scripts/pages/trip.ts');

    assert.match(tripPageScript, /target = mapUrl \? '_blank' : ''/);
    assert.match(tripPageScript, /rel = mapUrl \? 'noopener noreferrer' : ''/);
    assert.doesNotMatch(tripPageScript, /rel = mapUrl \? 'noreferrer' : ''/);
  });

  it('keeps Firebase profile sync from blocking authenticated sessions', () => {
    const sessionSource = readText('src/lib/firebase/session.ts');

    assert.match(sessionSource, /async function trySyncUserProfile/);
    assert.match(sessionSource, /catch \(error\)/);
    assert.match(sessionSource, /console\.warn\('syncUserProfile', error\)/);
    assert.match(sessionSource, /void trySyncUserProfile\(user\)/);
    assert.match(sessionSource, /callback\(user\)/);
    assert.doesNotMatch(sessionSource, /await syncUserProfile\(credential\.user\)/);
  });

  it('uses geolocation-specific errors instead of auth errors for current location', () => {
    const tripPageScript = readText('src/scripts/pages/trip.ts');
    const i18nHelper = readText('src/i18n/ui.ts');
    const esMessages = readJson('src/i18n/feature-translations/geolocation/es.json');
    const enMessages = readJson('src/i18n/feature-translations/geolocation/en.json');

    assert.match(tripPageScript, /geolocation\.error\.unsupported/);
    assert.match(tripPageScript, /geolocation\.error\.unavailable/);
    assert.doesNotMatch(tripPageScript, /geolocation[\s\S]{0,400}auth\.error/);
    assert.match(i18nHelper, /feature-translations\/geolocation\/es\.json/);
    assert.equal(typeof esMessages['geolocation.error.unsupported'], 'string');
    assert.equal(typeof esMessages['geolocation.error.unavailable'], 'string');
    assert.deepEqual(Object.keys(enMessages).sort(), Object.keys(esMessages).sort());
  });

  it('includes GitHub workflows for CI and Pages', () => {
    const pagesWorkflow = readText('.github/workflows/pages.yml');
    const ciWorkflow = readText('.github/workflows/ci.yml');

    assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
    assert.match(pagesWorkflow, /npm run build/);
    assert.match(pagesWorkflow, /npm test/);
    assert.match(ciWorkflow, /pull_request/);
    assert.match(ciWorkflow, /npm run build/);
    assert.match(ciWorkflow, /npm test/);
  });

  it('keeps useful project documentation available', () => {
    const readme = readText('README.md');

    assert.match(readme, /\S/, 'README.md should not be empty');
    assert.equal(existsSync(join(root, 'agents.md')), true, 'agents.md should exist');
    assert.equal(existsSync(join(root, 'docs/design-system.md')), true, 'docs/design-system.md should exist');
    assert.equal(existsSync(join(root, 'docs/ai-authenticated-client.md')), true, 'docs/ai-authenticated-client.md should exist');
    assert.equal(existsSync(join(root, 'docs/firebase-guide.md')), true, 'docs/firebase-guide.md should exist');
    assert.equal(existsSync(join(root, 'public/CNAME')), true, 'public/CNAME should exist');
  });

  it('keeps AppShell pages inside a single main card', () => {
    const pageFiles = readdirSync(join(root, 'src/components/pages')).filter((file) => file.endsWith('.astro'));

    pageFiles.forEach((file) => {
      const source = readText(`src/components/pages/${file}`);

      if (!source.includes('<AppShell')) {
        return;
      }

      assert.doesNotMatch(
        source,
        /<\/AppShell>\s*<Container[\s\S]*section-shell/,
        `${file} should keep the main page content inside AppShell instead of creating a second large card`
      );
    });
  });
});
