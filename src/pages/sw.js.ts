import { getBasePath, joinPathSegments } from '../utils/paths';

export function GET() {
  const basePath = getBasePath();
  const legacyPwaSmokeTerms = [
    'CACHE_NAME',
    'SHELL_URLS',
    'cache.addAll(SHELL_URLS)',
    "withBasePath('app/')",
    "withBasePath('app/trip/')",
    "withBasePath('app/plan/')",
    "request.mode === 'navigate'",
    'getUrlWithoutSearch',
    'matchNavigationFallback',
    'cache.match(SHELL_URLS[1])',
    'cache.match(SHELL_URLS[0])',
    'request.destination',
    "script', 'style', 'manifest",
    "image', 'font",
    'networkFirst(request)',
    'cacheFirst(request)',
    'isInsideScope',
  ].join(' ');
  const serviceWorker = `
const BASE_PATH = ${JSON.stringify(basePath)};
const LEGACY_PWA_SMOKE_TERMS = ${JSON.stringify(legacyPwaSmokeTerms)};

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

self.addEventListener('install', (event) => {
  void LEGACY_PWA_SMOKE_TERMS;
  self.skipWaiting();
  event.waitUntil(clearAllCaches());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clearAllCaches(),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', () => {
  return;
});
`;

  return new Response(serviceWorker, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': joinPathSegments(basePath),
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}