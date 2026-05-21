import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

describe('PWA offline support', () => {
  it('keeps PWA structural files available', () => {
    [
      'src/pages/manifest.webmanifest.ts',
      'src/pages/sw.js.ts',
      'src/scripts/pwa/register-service-worker.ts',
      'src/scripts/pwa/connection-status.ts',
      'src/components/PwaConnectionStatus.astro',
      'src/styles/pwa-status.css',
      'docs/pwa-offline.md',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps the web manifest installable and base-aware', () => {
    const manifest = readText('src/pages/manifest.webmanifest.ts');

    assert.match(manifest, /start_url/);
    assert.match(manifest, /scope/);
    assert.match(manifest, /display_override/);
    assert.match(manifest, /standalone/);
    assert.match(manifest, /purpose: 'any maskable'/);
    assert.match(manifest, /getBasePath/);
    assert.match(manifest, /withBasePath/);
  });

  it('registers a base-aware service worker', () => {
    const layout = readText('src/layouts/BaseLayout.astro');
    const registration = readText('src/scripts/pwa/register-service-worker.ts');
    const worker = readText('src/pages/sw.js.ts');

    assert.match(layout, /registerServiceWorker/);
    assert.match(registration, /navigator\.serviceWorker/);
    assert.match(registration, /withBasePath\('sw\.js'\)/);
    assert.match(registration, /scope: getBasePath\(\)/);
    assert.match(worker, /Service-Worker-Allowed/);
    assert.match(worker, /joinPathSegments\(basePath\)/);
  });

  it('caches shell, navigation fallbacks and static assets safely', () => {
    const worker = readText('src/pages/sw.js.ts');

    assert.match(worker, /CACHE_NAME/);
    assert.match(worker, /SHELL_URLS/);
    assert.match(worker, /cache\.addAll\(SHELL_URLS\)/);
    assert.match(worker, /withBasePath\('app\/'\)/);
    assert.match(worker, /withBasePath\('app\/trip\/'\)/);
    assert.match(worker, /withBasePath\('app\/plan\/'\)/);
    assert.match(worker, /request\.mode === 'navigate'/);
    assert.match(worker, /getUrlWithoutSearch/);
    assert.match(worker, /matchNavigationFallback/);
    assert.match(worker, /cache\.match\(SHELL_URLS\[1\]\)/);
    assert.match(worker, /cache\.match\(SHELL_URLS\[0\]\)/);
    assert.match(worker, /request\.destination/);
    assert.match(worker, /script', 'style', 'manifest/);
    assert.match(worker, /image', 'font/);
    assert.match(worker, /networkFirst\(request\)/);
    assert.match(worker, /cacheFirst\(request\)/);
    assert.match(worker, /isInsideScope/);
  });

  it('shows an accessible localized connection status', () => {
    const layout = readText('src/layouts/BaseLayout.astro');
    const component = readText('src/components/PwaConnectionStatus.astro');
    const script = readText('src/scripts/pwa/connection-status.ts');
    const styles = readText('src/styles/pwa-status.css');
    const ui = readText('src/i18n/ui.ts');
    const es = readText('src/i18n/feature-translations/pwa-status/es.json');
    const en = readText('src/i18n/feature-translations/pwa-status/en.json');

    assert.match(layout, /PwaConnectionStatus/);
    assert.match(component, /aria-live="polite"/);
    assert.match(component, /role="status"/);
    assert.match(component, /data-pwa-connection-status/);
    assert.match(script, /navigator\.onLine/);
    assert.match(script, /addEventListener\('online'/);
    assert.match(script, /addEventListener\('offline'/);
    assert.match(styles, /pwa-connection-status/);
    assert.match(ui, /pwaStatusEs/);
    assert.match(ui, /pwaStatusEn/);
    assert.match(es, /pwaStatus\.offline/);
    assert.match(en, /pwaStatus\.offline/);
  });

  it('enables persistent Firestore local cache where supported and iOS-safe fallbacks', () => {
    const config = readText('src/lib/firebase/config.ts');
    const sharedCache = readText('src/lib/firebase/shared-data-cache.ts');

    assert.match(config, /initializeFirestore/);
    assert.match(config, /persistentLocalCache/);
    assert.match(config, /persistentMultipleTabManager/);
    assert.match(config, /shouldUseSafeFirestoreMode/);
    assert.match(config, /maxTouchPoints/);
    assert.match(config, /MacIntel/);
    assert.match(config, /AppleWebKit/);
    assert.match(config, /firebaseDb = getFirestore\(app\)/);
    assert.match(sharedCache, /window\.localStorage/);
    assert.doesNotMatch(sharedCache, /window\.sessionStorage/);
    assert.match(sharedCache, /travel-plan:shared-cache:v2/);
  });

  it('documents current offline limits and next phases', () => {
    const docs = readText('docs/pwa-offline.md');

    assert.match(docs, /Persistencia offline de Firestore/);
    assert.match(docs, /[Ff]allback de navegación/);
    assert.match(docs, /network-first de scripts, estilos y manifest/);
    assert.match(docs, /localStorage/);
    assert.match(docs, /parámetros/);
    assert.match(docs, /Estado de conexión/);
    assert.match(docs, /Siguientes fases recomendadas/);
    assert.match(docs, /cola visible de cambios pendientes/);
    assert.match(docs, /Safari iOS/i);
    assert.match(docs, /getFirebaseDb\(\)/);
  });
});
