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
    assert.match(worker, /request\.mode === 'navigate'/);
    assert.match(worker, /cache\.match\(SHELL_URLS\[0\]\)/);
    assert.match(worker, /request\.destination/);
    assert.match(worker, /script', 'style', 'manifest/);
    assert.match(worker, /image', 'font/);
    assert.match(worker, /networkFirst\(request\)/);
    assert.match(worker, /cacheFirst\(request\)/);
    assert.match(worker, /isInsideScope/);
  });

  it('enables persistent Firestore local cache', () => {
    const config = readText('src/lib/firebase/config.ts');

    assert.match(config, /initializeFirestore/);
    assert.match(config, /persistentLocalCache/);
    assert.match(config, /persistentMultipleTabManager/);
    assert.match(config, /shouldUseSafeFirestoreMode/);
    assert.match(config, /iPad\|iPhone\|iPod/);
    assert.match(config, /firebaseDb = getFirestore\(app\)/);
  });

  it('documents current offline limits and next phases', () => {
    const docs = readText('docs/pwa-offline.md');

    assert.match(docs, /Persistencia offline de Firestore/);
    assert.match(docs, /[Ff]allback de navegación/);
    assert.match(docs, /network-first de scripts, estilos y manifest/);
    assert.match(docs, /Siguientes fases recomendadas/);
    assert.match(docs, /cola visible de cambios pendientes/);
  });
});
